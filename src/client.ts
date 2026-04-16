import {
  ApiError,
  AuthenticationError,
  DiscordInvitesError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
} from './errors.js';
import type { ClientOptions, Envelope, RateLimitInfo } from './types.js';
import { ServersResource } from './resources/servers.js';
import { EmojisResource } from './resources/emojis.js';
import { CategoriesResource } from './resources/categories.js';
import { TagsResource } from './resources/tags.js';
import { StatsResource } from './resources/stats.js';
import { LeaderboardsResource } from './resources/leaderboards.js';
import { MeResource } from './resources/me.js';

const DEFAULT_BASE_URL = 'https://discordinvites.net/api/public/v1';
const SDK_VERSION = '1.0.0';
const MAX_RETRY_DELAY_MS = 60_000;

export interface RequestOptions {
  /** Query params serialized with `URLSearchParams`. `undefined` values are skipped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** AbortSignal forwarded to the underlying `fetch` call. */
  signal?: AbortSignal;
  /** Override the per-request retry budget for 429 responses. */
  maxRetries?: number;
}

/**
 * The main SDK entry point. Instantiate once at bot startup and reuse.
 *
 * ```ts
 * import { DiscordInvitesClient } from 'discordinvites';
 * const di = new DiscordInvitesClient({ apiKey: process.env.DISCORDINVITES_API_KEY! });
 * const top = await di.servers.top({ limit: 5 });
 * ```
 */
export class DiscordInvitesClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;
  private readonly userAgent: string;
  private readonly fetchImpl: typeof fetch;

  /** Last observed rate-limit state, updated after every response carrying `X-RateLimit-*`. */
  public lastRateLimit: RateLimitInfo | null = null;

  public readonly servers: ServersResource;
  public readonly emojis: EmojisResource;
  public readonly categories: CategoriesResource;
  public readonly tags: TagsResource;
  public readonly stats: StatsResource;
  public readonly leaderboards: LeaderboardsResource;
  public readonly me: MeResource;

  constructor(opts: ClientOptions) {
    if (!opts.apiKey || typeof opts.apiKey !== 'string') {
      throw new DiscordInvitesError('apiKey is required');
    }

    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.maxRetries = opts.maxRetries ?? 2;
    this.timeoutMs = opts.timeoutMs ?? 15_000;
    this.userAgent = opts.userAgent ?? `discordinvites-sdk-node/${SDK_VERSION}`;
    this.fetchImpl = opts.fetch ?? globalThis.fetch;

    if (typeof this.fetchImpl !== 'function') {
      throw new DiscordInvitesError(
        'No fetch implementation found. Use Node 18+ or pass `fetch` in ClientOptions.',
      );
    }

    this.servers = new ServersResource(this);
    this.emojis = new EmojisResource(this);
    this.categories = new CategoriesResource(this);
    this.tags = new TagsResource(this);
    this.stats = new StatsResource(this);
    this.leaderboards = new LeaderboardsResource(this);
    this.me = new MeResource(this);
  }

  /** Low-level request helper. Resources call into this; most users never need it directly. */
  public async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, opts.query);
    const maxRetries = opts.maxRetries ?? this.maxRetries;
    let attempt = 0;

    while (true) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const externalAbort = () => controller.abort();
      if (opts.signal) {
        if (opts.signal.aborted) controller.abort();
        else opts.signal.addEventListener('abort', externalAbort, { once: true });
      }

      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: 'application/json',
            'User-Agent': this.userAgent,
          },
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        opts.signal?.removeEventListener('abort', externalAbort);
        if (controller.signal.aborted && !opts.signal?.aborted) {
          throw new TimeoutError(this.timeoutMs);
        }
        throw new NetworkError('Network request failed', err);
      }
      clearTimeout(timer);
      opts.signal?.removeEventListener('abort', externalAbort);

      this.updateRateLimit(response);

      if (response.status === 429 && attempt < maxRetries) {
        const retryAfter = parseRetryAfter(response);
        await sleep(Math.min(retryAfter * 1000, MAX_RETRY_DELAY_MS));
        attempt += 1;
        continue;
      }

      return this.handleResponse<T>(response);
    }
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const base = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(this.baseUrl + base);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private updateRateLimit(response: Response): void {
    const limit = response.headers.get('x-ratelimit-limit');
    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');
    if (limit && remaining && reset) {
      this.lastRateLimit = {
        limit: Number(limit),
        remaining: Number(remaining),
        resetAt: new Date(Number(reset) * 1000),
      };
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') ?? '';
    const body: unknown = contentType.includes('application/json')
      ? await response.json().catch(() => undefined)
      : await response.text().catch(() => undefined);

    if (response.ok) {
      return body as T;
    }

    const { code, message } = extractError(body, response.status);

    if (response.status === 401 || response.status === 403) {
      throw new AuthenticationError(message, { body });
    }
    if (response.status === 404) {
      throw new NotFoundError(message, { body });
    }
    if (response.status === 429) {
      const retryAfter = parseRetryAfter(response);
      throw new RateLimitError(message, {
        retryAfter,
        remaining: this.lastRateLimit?.remaining ?? 0,
        resetAt: this.lastRateLimit?.resetAt ?? new Date(Date.now() + retryAfter * 1000),
        body,
      });
    }
    throw new ApiError(response.status, code, message, body);
  }
}

function parseRetryAfter(response: Response): number {
  const header = response.headers.get('retry-after');
  if (!header) return 1;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) return seconds;
  const date = Date.parse(header);
  if (Number.isFinite(date)) {
    return Math.max(1, Math.ceil((date - Date.now()) / 1000));
  }
  return 1;
}

function extractError(body: unknown, status: number): { code: string; message: string } {
  if (body && typeof body === 'object' && 'error' in body) {
    const e = (body as { error: unknown }).error;
    if (e && typeof e === 'object') {
      const code = (e as { code?: unknown }).code;
      const message = (e as { message?: unknown }).message;
      return {
        code: typeof code === 'string' ? code : `http_${status}`,
        message: typeof message === 'string' ? message : `HTTP ${status}`,
      };
    }
  }
  return { code: `http_${status}`, message: `HTTP ${status}` };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type { Envelope, RequestOptions as ClientRequestOptions };

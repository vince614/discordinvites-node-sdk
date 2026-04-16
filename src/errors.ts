/**
 * Every thrown error is an instance of `DiscordInvitesError`. Subclasses add context for
 * the specific failure mode so consumers can write `if (err instanceof RateLimitError)`
 * rather than parsing status codes by hand.
 */
export class DiscordInvitesError extends Error {
  public readonly status?: number;
  public readonly code?: string;
  public readonly body?: unknown;

  constructor(
    message: string,
    opts: { status?: number; code?: string; body?: unknown; cause?: unknown } = {},
  ) {
    super(message, { cause: opts.cause });
    this.name = 'DiscordInvitesError';
    this.status = opts.status;
    this.code = opts.code;
    this.body = opts.body;
  }
}

export class AuthenticationError extends DiscordInvitesError {
  constructor(message: string, opts: { body?: unknown } = {}) {
    super(message, { status: 401, code: 'unauthorized', body: opts.body });
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends DiscordInvitesError {
  constructor(message: string, opts: { body?: unknown } = {}) {
    super(message, { status: 404, code: 'not_found', body: opts.body });
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends DiscordInvitesError {
  /** Seconds the caller should wait before retrying. */
  public readonly retryAfter: number;

  /** Remaining tokens in the current window (always 0 on 429 but kept for symmetry). */
  public readonly remaining: number;

  /** Timestamp when the bucket refills. */
  public readonly resetAt: Date;

  constructor(
    message: string,
    opts: { retryAfter: number; remaining: number; resetAt: Date; body?: unknown },
  ) {
    super(message, { status: 429, code: 'rate_limit_exceeded', body: opts.body });
    this.name = 'RateLimitError';
    this.retryAfter = opts.retryAfter;
    this.remaining = opts.remaining;
    this.resetAt = opts.resetAt;
  }
}

export class ApiError extends DiscordInvitesError {
  constructor(status: number, code: string, message: string, body?: unknown) {
    super(message, { status, code, body });
    this.name = 'ApiError';
  }
}

export class NetworkError extends DiscordInvitesError {
  constructor(message: string, cause: unknown) {
    super(message, { cause });
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends DiscordInvitesError {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

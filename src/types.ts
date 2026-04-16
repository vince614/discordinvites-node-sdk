/**
 * Shared types for the DiscordInvites Node SDK.
 *
 * Every response envelope from the public API follows the `{ data, meta? }` shape.
 * These types mirror the fields the backend exposes via PublicApiSerializer — if a new
 * field is added server-side, bump the SDK's minor version.
 */

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface Envelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface Server {
  guildId: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  inviteUrl: string | null;
  primaryColor: string | null;
  category: string | null;
  tags: string[];
  language: string | null;
  memberCount: number;
  onlineCount: number;
  votes: number;
  totalVotes: number;
  bumps: number;
  likes: number;
  isPremium: boolean;
  isNsfw: boolean;
  isVerified: boolean;
  isPartner: boolean;
  createdAt: string;
  lastBumpAt: string | null;
}

export interface Emoji {
  id: string;
  name: string;
  url: string;
  animated: boolean;
  guildId: string;
  guildName: string;
  guildIcon: string | null;
  downloadCount: number;
  likes: number;
  createdAt: string;
}

export interface Category {
  slug: string;
  name: string;
  icon: string | null;
  color: string | null;
  serverCount: number;
}

export interface Tag {
  name: string;
  count: number;
}

export interface GlobalStats {
  servers: number;
  users: number;
  categories: number;
  votes: number;
  emojis: number;
}

export interface ServerLeaderboardEntry {
  guildId: string;
  name: string;
  iconUrl: string | null;
  votes: number;
  rank: number;
}

export interface UserLeaderboardEntry {
  discordId: string;
  name: string;
  avatarUrl: string | null;
  votes: number;
  rank: number;
}

export type LeaderboardPeriod = 'day' | 'week' | 'month' | 'all';

export interface Me {
  user: {
    discordId: string;
    name: string;
  };
  key: {
    id: number;
    name: string;
    prefix: string;
    scopes: string[];
    createdAt: string;
    lastUsedAt: string | null;
    expiresAt: string | null;
  };
  tier: 'free' | 'premium';
  usageToday: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}

export interface ServerListOptions {
  page?: number;
  perPage?: number;
  category?: string;
  tag?: string;
  search?: string;
  orderBy?: 'recent' | 'top' | 'bumps' | 'votes' | 'members';
}

export interface EmojiListOptions {
  page?: number;
  perPage?: number;
  search?: string;
  guildId?: string;
  type?: 'static' | 'animated';
  orderBy?: 'recent' | 'popular' | 'name';
}

export interface LeaderboardOptions {
  period?: LeaderboardPeriod;
  limit?: number;
}

export interface ClientOptions {
  /**
   * API key in the form `di_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.
   * Create one at https://discordinvites.net/developers/keys.
   */
  apiKey: string;

  /**
   * Override the API base URL. Useful for preprod/local testing.
   * Defaults to `https://discordinvites.net/api/public/v1`.
   */
  baseUrl?: string;

  /**
   * How many times to auto-retry on HTTP 429. Default: 2.
   * Each retry waits for the server's `Retry-After` value (capped at 60s).
   * Set to 0 to disable auto-retry and always throw `RateLimitError` instead.
   */
  maxRetries?: number;

  /**
   * Request timeout in milliseconds. Default: 15000.
   */
  timeoutMs?: number;

  /**
   * Override the User-Agent. Defaults to `discordinvites-sdk-node/<version>`.
   * Set this to something identifying your bot so abuse is easier to trace.
   */
  userAgent?: string;

  /**
   * Custom fetch implementation. Defaults to the global `fetch` (Node 18+ / browsers).
   */
  fetch?: typeof fetch;
}

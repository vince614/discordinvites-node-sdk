import type { DiscordInvitesClient } from '../client.js';
import type {
  LeaderboardOptions,
  ServerLeaderboardEntry,
  UserLeaderboardEntry,
} from '../types.js';

export class LeaderboardsResource {
  constructor(private readonly client: DiscordInvitesClient) {}

  async servers(options: LeaderboardOptions = {}): Promise<ServerLeaderboardEntry[]> {
    const res = await this.client.request<{ data: ServerLeaderboardEntry[] }>(
      '/leaderboards/servers',
      { query: { period: options.period, limit: options.limit } },
    );
    return res.data;
  }

  async users(options: LeaderboardOptions = {}): Promise<UserLeaderboardEntry[]> {
    const res = await this.client.request<{ data: UserLeaderboardEntry[] }>(
      '/leaderboards/users',
      { query: { period: options.period, limit: options.limit } },
    );
    return res.data;
  }
}

import type { DiscordInvitesClient } from '../client.js';
import type { GlobalStats } from '../types.js';

export class StatsResource {
  constructor(private readonly client: DiscordInvitesClient) {}

  /** Global counters (servers, users, votes, emojis, categories). Cached 10 min server-side. */
  async global(): Promise<GlobalStats> {
    const res = await this.client.request<{ data: GlobalStats }>('/stats');
    return res.data;
  }
}

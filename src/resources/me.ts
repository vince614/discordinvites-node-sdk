import type { DiscordInvitesClient } from '../client.js';
import type { Me } from '../types.js';

export class MeResource {
  constructor(private readonly client: DiscordInvitesClient) {}

  /** Returns the account owning the API key, its tier (free/premium) and today's quota usage. */
  async info(): Promise<Me> {
    const res = await this.client.request<{ data: Me }>('/me');
    return res.data;
  }
}

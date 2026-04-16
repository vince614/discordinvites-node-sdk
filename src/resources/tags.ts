import type { DiscordInvitesClient } from '../client.js';
import type { Tag } from '../types.js';

export class TagsResource {
  constructor(private readonly client: DiscordInvitesClient) {}

  async list(options: { limit?: number } = {}): Promise<Tag[]> {
    const res = await this.client.request<{ data: Tag[] }>('/tags', {
      query: { limit: options.limit },
    });
    return res.data;
  }
}

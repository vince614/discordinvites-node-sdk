import type { DiscordInvitesClient } from '../client.js';
import type { Category } from '../types.js';

export class CategoriesResource {
  constructor(private readonly client: DiscordInvitesClient) {}

  async list(): Promise<Category[]> {
    const res = await this.client.request<{ data: Category[] }>('/categories');
    return res.data;
  }
}

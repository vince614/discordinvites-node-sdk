import type { DiscordInvitesClient } from '../client.js';
import type { Emoji, EmojiListOptions, Paginated } from '../types.js';

export class EmojisResource {
  constructor(private readonly client: DiscordInvitesClient) {}

  async list(options: EmojiListOptions = {}): Promise<Paginated<Emoji>> {
    return this.client.request<Paginated<Emoji>>('/emojis', {
      query: {
        page: options.page,
        perPage: options.perPage,
        search: options.search,
        guildId: options.guildId,
        type: options.type,
        orderBy: options.orderBy,
      },
    });
  }

  async get(emojiId: string): Promise<Emoji> {
    const res = await this.client.request<{ data: Emoji }>(`/emojis/${encodeURIComponent(emojiId)}`);
    return res.data;
  }

  async *iterate(options: EmojiListOptions = {}): AsyncIterableIterator<Emoji> {
    let page = options.page ?? 1;
    const perPage = options.perPage ?? 60;
    while (true) {
      const result = await this.list({ ...options, page, perPage });
      for (const emoji of result.data) yield emoji;
      if (page >= result.meta.totalPages || result.data.length === 0) return;
      page += 1;
    }
  }
}

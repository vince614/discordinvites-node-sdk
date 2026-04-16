import type { DiscordInvitesClient } from '../client.js';
import type { Paginated, Server, ServerListOptions } from '../types.js';

export class ServersResource {
  constructor(private readonly client: DiscordInvitesClient) {}

  /** Paginated list with optional filters (category, tag, search, orderBy). */
  async list(options: ServerListOptions = {}): Promise<Paginated<Server>> {
    return this.client.request<Paginated<Server>>('/servers', {
      query: {
        page: options.page,
        perPage: options.perPage,
        category: options.category,
        tag: options.tag,
        search: options.search,
        orderBy: options.orderBy,
      },
    });
  }

  /** Top N servers by vote count. `limit` is capped server-side at 50. */
  async top(options: { limit?: number } = {}): Promise<Server[]> {
    const res = await this.client.request<{ data: Server[] }>('/servers/top', {
      query: { limit: options.limit },
    });
    return res.data;
  }

  /** N most recently added servers. `limit` is capped server-side at 50. */
  async recent(options: { limit?: number } = {}): Promise<Server[]> {
    const res = await this.client.request<{ data: Server[] }>('/servers/recent', {
      query: { limit: options.limit },
    });
    return res.data;
  }

  /** Fetch a single server by its Discord guild id. Throws `NotFoundError` if missing or banned. */
  async get(guildId: string): Promise<Server> {
    const res = await this.client.request<{ data: Server }>(`/servers/${encodeURIComponent(guildId)}`);
    return res.data;
  }

  /**
   * Iterate through every page of `list()` transparently. Useful for bulk operations.
   *
   * ```ts
   * for await (const server of di.servers.iterate({ category: 'gaming' })) {
   *   console.log(server.name);
   * }
   * ```
   */
  async *iterate(options: ServerListOptions = {}): AsyncIterableIterator<Server> {
    let page = options.page ?? 1;
    const perPage = options.perPage ?? 50;
    while (true) {
      const result = await this.list({ ...options, page, perPage });
      for (const server of result.data) yield server;
      if (page >= result.meta.totalPages || result.data.length === 0) return;
      page += 1;
    }
  }
}

# discordinvites

Official Node.js SDK for the [DiscordInvites](https://discordinvites.net) public API.

- Zero runtime dependencies (uses the native `fetch` of Node 18+)
- Typed — every endpoint returns a typed model
- Automatic rate-limit handling (parses `X-RateLimit-*` headers, retries on HTTP 429)
- Async iterators for paginated endpoints
- Friendly error classes (`RateLimitError`, `NotFoundError`, `AuthenticationError`, …)

## Install

```bash
npm install discordinvites
# or
pnpm add discordinvites
# or
yarn add discordinvites
```

Requires **Node.js 18+**.

## Get an API key

1. Sign in on <https://discordinvites.net>.
2. Go to <https://discordinvites.net/developers/keys>.
3. Click **Create key**, copy the `di_live_…` secret — it is shown only once.

Store it in an environment variable:

```bash
DISCORDINVITES_API_KEY=di_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Quickstart

```ts
import { DiscordInvitesClient } from 'discordinvites';

const di = new DiscordInvitesClient({
  apiKey: process.env.DISCORDINVITES_API_KEY!,
});

const top = await di.servers.top({ limit: 5 });
console.log(top.map((s) => `${s.name} — ${s.votes} votes`));

const { data, meta } = await di.servers.list({ category: 'gaming', perPage: 20 });
console.log(`page 1/${meta.totalPages}: ${data.length} servers`);
```

## Discord bot (discord.js v14)

A minimal `/topservers` slash command:

```ts
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { DiscordInvitesClient } from 'discordinvites';

const di = new DiscordInvitesClient({ apiKey: process.env.DISCORDINVITES_API_KEY! });
const bot = new Client({ intents: [GatewayIntentBits.Guilds] });

bot.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'topservers') return;

  await interaction.deferReply();
  const top = await di.servers.top({ limit: 5 });

  const embed = new EmbedBuilder()
    .setTitle('🔥 Top 5 DiscordInvites servers')
    .setColor(0x5865f2)
    .setDescription(
      top
        .map((s, i) => `**${i + 1}.** [${s.name}](${s.inviteUrl ?? '#'}) — ${s.votes} votes, ${s.memberCount.toLocaleString()} members`)
        .join('\n'),
    );

  await interaction.editReply({ embeds: [embed] });
});

bot.login(process.env.DISCORD_TOKEN);
```

A runnable version lives in [`examples/discord-bot.ts`](./examples/discord-bot.ts).

## Configuration

```ts
new DiscordInvitesClient({
  apiKey: 'di_live_…',            // required
  baseUrl: 'https://preprod.discordinvites.net/api/public/v1', // override per env
  maxRetries: 2,                  // auto-retry budget for HTTP 429 (default 2)
  timeoutMs: 15_000,              // request timeout (default 15s)
  userAgent: 'my-bot/1.0 (@me)',  // identify your integration
  fetch: myCustomFetch,           // inject undici.fetch, cross-fetch, etc.
});
```

## Available resources

| Namespace                | Method                                       | Endpoint                                   |
|--------------------------|----------------------------------------------|--------------------------------------------|
| `di.servers`             | `list(opts?)` → paginated                    | `GET /servers`                             |
| `di.servers`             | `top({ limit })`                             | `GET /servers/top`                         |
| `di.servers`             | `recent({ limit })`                          | `GET /servers/recent`                      |
| `di.servers`             | `get(guildId)`                               | `GET /servers/{guildId}`                   |
| `di.servers`             | `iterate(opts?)` — async generator           | paginates `/servers` internally            |
| `di.emojis`              | `list(opts?)` → paginated                    | `GET /emojis`                              |
| `di.emojis`              | `get(emojiId)`                               | `GET /emojis/{id}`                         |
| `di.emojis`              | `iterate(opts?)` — async generator           | paginates `/emojis` internally             |
| `di.categories`          | `list()`                                     | `GET /categories`                          |
| `di.tags`                | `list({ limit })`                            | `GET /tags`                                |
| `di.stats`               | `global()`                                   | `GET /stats`                               |
| `di.leaderboards`        | `servers({ period, limit })`                 | `GET /leaderboards/servers`                |
| `di.leaderboards`        | `users({ period, limit })`                   | `GET /leaderboards/users`                  |
| `di.me`                  | `info()` — your account + today's usage      | `GET /me`                                  |

## Rate limits

- **Free**: 60 req/min
- **Premium**: 300 req/min (automatic if your DiscordInvites account has an active subscription)

Every response exposes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. The SDK caches the last values on `di.lastRateLimit`:

```ts
await di.servers.top();
console.log(di.lastRateLimit);
// { limit: 60, remaining: 59, resetAt: 2026-04-17T10:35:12.000Z }
```

On HTTP 429 the SDK auto-retries `maxRetries` times, waiting for the server's `Retry-After` (capped at 60s). Set `maxRetries: 0` to opt out and always receive a `RateLimitError` instead.

## Error handling

```ts
import {
  DiscordInvitesClient,
  RateLimitError,
  AuthenticationError,
  NotFoundError,
  ApiError,
} from 'discordinvites';

try {
  await di.servers.get('123456789012345678');
} catch (err) {
  if (err instanceof NotFoundError)          console.log('No such server');
  else if (err instanceof AuthenticationError) console.log('Bad/revoked key');
  else if (err instanceof RateLimitError)    console.log(`Retry after ${err.retryAfter}s`);
  else if (err instanceof ApiError)          console.log(`HTTP ${err.status}: ${err.code}`);
  else throw err;
}
```

All errors extend `DiscordInvitesError` and carry `.status`, `.code`, and `.body` (raw server payload).

## Pagination

```ts
// Page-by-page (gives you access to meta.totalPages)
const { data, meta } = await di.servers.list({ page: 2, perPage: 50 });

// Auto-paginating async iterator
for await (const server of di.servers.iterate({ category: 'gaming' })) {
  console.log(server.name);
}
```

## Environments

| Env       | Base URL                                                  |
|-----------|-----------------------------------------------------------|
| Local     | `https://localhost:8443/api/public/v1`                    |
| Preprod   | `https://preprod.discordinvites.net/api/public/v1`        |
| Prod      | `https://discordinvites.net/api/public/v1` *(default)*    |

```ts
const di = new DiscordInvitesClient({
  apiKey: process.env.DISCORDINVITES_API_KEY!,
  baseUrl: process.env.NODE_ENV === 'production'
    ? 'https://discordinvites.net/api/public/v1'
    : 'https://preprod.discordinvites.net/api/public/v1',
});
```

## OpenAPI / Swagger UI

Browse and try out every endpoint at **<https://discordinvites.net/api/doc>** (or `/api/doc.json` for the raw OpenAPI 3 schema).

## License

MIT

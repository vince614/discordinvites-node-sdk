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

## Webhooks

Subscribe to real-time events (`vote.created`, `server.bumped`, `review.created`) for servers you own. Create your webhook at <https://discordinvites.net/developers/webhooks>, copy the signing secret, then receive events over HTTPS.

```ts
import express from 'express';
import { verifyWebhookSignature, type WebhookEvent } from 'discordinvites';

const app = express();

// Raw body is REQUIRED — JSON.parse loses byte-for-byte equality.
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.header('x-discordinvites-signature');

  if (!verifyWebhookSignature(req.body, signature, process.env.DI_WEBHOOK_SECRET!)) {
    return res.status(401).send('invalid signature');
  }

  const event = JSON.parse(req.body.toString('utf8')) as WebhookEvent;

  switch (event.type) {
    case 'vote.created':
      console.log(`${event.data.voter.name} voted for ${event.data.server.name}`);
      break;
    case 'server.bumped':
      console.log(`${event.data.server.name} bumped ${event.data.bumps} times`);
      break;
    case 'review.created':
      console.log(`${event.data.review.rating}★ on ${event.data.server.name}`);
      break;
  }

  res.status(200).send('ok'); // Reply 2xx within 10s or the delivery is retried.
});

app.listen(3030);
```

Runnable: [`examples/webhook-receiver.ts`](./examples/webhook-receiver.ts).

### Event catalog

| Type               | Fires when                           | `data` fields                                                       |
|--------------------|--------------------------------------|---------------------------------------------------------------------|
| `vote.created`     | A user votes for one of your servers | `server`, `voter`, `votes`, `totalVotes`                            |
| `server.bumped`    | Your server is bumped                | `server`, `bumps`                                                   |
| `review.created`   | A review is posted on your server    | `server`, `review { id, authorDiscordId, authorName, rating, comment }` |
| `test.ping`        | Manual test from the dashboard       | `message`                                                           |

### Headers

| Header                       | Purpose                                                        |
|------------------------------|----------------------------------------------------------------|
| `X-DiscordInvites-Event`     | Event type string (mirrors `event.type`)                       |
| `X-DiscordInvites-Delivery`  | ULID, stable across retries — use for **idempotency**          |
| `X-DiscordInvites-Signature` | `sha256=<hmac>` of the raw body with your webhook secret       |

### Retry & auto-disable

- Retries on HTTP 5xx, 408, 429 or timeout (10s total). Exponential backoff, up to 10 attempts.
- 4xx responses (except 408/429) are permanent — no retry, counts as one consecutive failure.
- **20 consecutive failures** ⇒ the webhook is auto-disabled, with an email sent to the owner.
- Re-enable from the dashboard once your endpoint is fixed.

## OpenAPI / Swagger UI

Browse and try out every endpoint at **<https://discordinvites.net/api/doc>** (or `/api/doc.json` for the raw OpenAPI 3 schema).

## License

MIT

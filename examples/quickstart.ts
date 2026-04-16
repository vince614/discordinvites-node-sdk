/**
 * Run with:   npx tsx examples/quickstart.ts
 * Prereqs:    DISCORDINVITES_API_KEY in your env.
 */
import { DiscordInvitesClient, RateLimitError } from '../src/index.js';

const apiKey = process.env.DISCORDINVITES_API_KEY;
if (!apiKey) {
  console.error('Set DISCORDINVITES_API_KEY first.');
  process.exit(1);
}

const di = new DiscordInvitesClient({ apiKey });

async function main() {
  const me = await di.me.info();
  console.log(`Signed in as ${me.user.name} (tier: ${me.tier}, used today: ${me.usageToday})`);

  const stats = await di.stats.global();
  console.log(`Platform total: ${stats.servers} servers / ${stats.users} users`);

  const top = await di.servers.top({ limit: 5 });
  console.log('\nTop 5 servers:');
  for (const [i, s] of top.entries()) {
    console.log(`  ${i + 1}. ${s.name} — ${s.votes} votes`);
  }

  const categories = await di.categories.list();
  console.log(`\n${categories.length} categories available`);

  if (di.lastRateLimit) {
    console.log(
      `\nRate limit: ${di.lastRateLimit.remaining}/${di.lastRateLimit.limit} (resets at ${di.lastRateLimit.resetAt.toLocaleTimeString()})`,
    );
  }
}

main().catch((err) => {
  if (err instanceof RateLimitError) {
    console.error(`Rate limited — wait ${err.retryAfter}s`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

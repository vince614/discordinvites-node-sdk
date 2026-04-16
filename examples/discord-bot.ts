/**
 * Minimal Discord bot that wraps four DiscordInvites commands.
 *
 * Run with:   npx tsx examples/discord-bot.ts
 * Prereqs:
 *   - DISCORD_TOKEN         → your bot's token
 *   - DISCORD_CLIENT_ID     → application id (for slash command registration)
 *   - DISCORDINVITES_API_KEY
 *   - npm i discord.js
 *
 * Commands:
 *   /topservers          → top 5 by vote count
 *   /server <guild_id>   → fetch a single server card
 *   /categories          → list all categories as a select menu
 *   /stats               → platform-wide counters
 */
import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { DiscordInvitesClient, NotFoundError, RateLimitError } from '../src/index.js';

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORDINVITES_API_KEY } = process.env;
if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !DISCORDINVITES_API_KEY) {
  console.error('Missing env var. Set DISCORD_TOKEN, DISCORD_CLIENT_ID and DISCORDINVITES_API_KEY.');
  process.exit(1);
}

const di = new DiscordInvitesClient({
  apiKey: DISCORDINVITES_API_KEY,
  userAgent: 'example-discord-bot/1.0',
});

const commands = [
  new SlashCommandBuilder()
    .setName('topservers')
    .setDescription('Show the top 5 DiscordInvites servers'),
  new SlashCommandBuilder()
    .setName('server')
    .setDescription('Look up a server by its Discord guild id')
    .addStringOption((o) => o.setName('guild_id').setDescription('Guild id').setRequired(true)),
  new SlashCommandBuilder().setName('categories').setDescription('List DiscordInvites categories'),
  new SlashCommandBuilder().setName('stats').setDescription('Show global platform stats'),
].map((c) => c.toJSON());

// Register commands globally at startup — in production, cache this and only re-run on changes.
await new REST({ version: '10' })
  .setToken(DISCORD_TOKEN)
  .put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commands });

const bot = new Client({ intents: [GatewayIntentBits.Guilds] });

bot.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    await dispatch(interaction);
  } catch (err) {
    await replyError(interaction, err);
  }
});

async function dispatch(i: ChatInputCommandInteraction) {
  await i.deferReply();

  switch (i.commandName) {
    case 'topservers': {
      const top = await di.servers.top({ limit: 5 });
      const embed = new EmbedBuilder()
        .setTitle('🔥 Top 5 DiscordInvites servers')
        .setColor(0x5865f2)
        .setDescription(
          top
            .map(
              (s, idx) =>
                `**${idx + 1}.** [${s.name}](${s.inviteUrl ?? '#'}) — ${s.votes} votes, ${s.memberCount.toLocaleString()} members`,
            )
            .join('\n'),
        );
      await i.editReply({ embeds: [embed] });
      return;
    }
    case 'server': {
      const guildId = i.options.getString('guild_id', true);
      const s = await di.servers.get(guildId);
      const embed = new EmbedBuilder()
        .setTitle(s.name)
        .setURL(s.inviteUrl ?? null)
        .setDescription(s.description ?? '*No description*')
        .setThumbnail(s.iconUrl)
        .setColor(s.primaryColor ? parseInt(s.primaryColor.replace('#', ''), 16) : 0x5865f2)
        .addFields(
          { name: 'Members', value: s.memberCount.toLocaleString(), inline: true },
          { name: 'Votes', value: s.votes.toString(), inline: true },
          { name: 'Bumps', value: s.bumps.toString(), inline: true },
        );
      if (s.tags.length) embed.addFields({ name: 'Tags', value: s.tags.slice(0, 10).join(', ') });
      await i.editReply({ embeds: [embed] });
      return;
    }
    case 'categories': {
      const cats = await di.categories.list();
      const list = cats.map((c) => `• **${c.name}** (\`${c.slug}\`) — ${c.serverCount} servers`).join('\n');
      await i.editReply({
        embeds: [new EmbedBuilder().setTitle('Categories').setColor(0x5865f2).setDescription(list.slice(0, 4000))],
      });
      return;
    }
    case 'stats': {
      const s = await di.stats.global();
      await i.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('📊 DiscordInvites platform')
            .setColor(0x5865f2)
            .addFields(
              { name: 'Servers', value: s.servers.toLocaleString(), inline: true },
              { name: 'Users', value: s.users.toLocaleString(), inline: true },
              { name: 'Votes', value: s.votes.toLocaleString(), inline: true },
              { name: 'Emojis', value: s.emojis.toLocaleString(), inline: true },
              { name: 'Categories', value: s.categories.toLocaleString(), inline: true },
            ),
        ],
      });
      return;
    }
  }
}

async function replyError(i: ChatInputCommandInteraction, err: unknown) {
  let msg: string;
  if (err instanceof NotFoundError) msg = '🤷 Server not found on DiscordInvites.';
  else if (err instanceof RateLimitError) msg = `⏳ Rate limited. Retry in ${err.retryAfter}s.`;
  else msg = '⚠️ Something went wrong. Try again later.';

  if (i.deferred || i.replied) await i.editReply(msg);
  else await i.reply({ content: msg, ephemeral: true });
  console.error(err);
}

await bot.login(DISCORD_TOKEN);
console.log('Bot is online.');

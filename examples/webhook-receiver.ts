/**
 * Minimal Express webhook receiver.
 *
 * Run:
 *   npm i express
 *   export DISCORDINVITES_WEBHOOK_SECRET=di_whsec_...  (copied at webhook creation time)
 *   npx tsx examples/webhook-receiver.ts
 *
 * Then expose it publicly (ngrok / cloudflared) and paste the URL into your
 * /developers/webhooks dashboard. Vote on one of your owned servers — this receiver
 * logs the event.
 */
import express from 'express';
import { verifyWebhookSignature, type WebhookEvent } from '../src/index.js';

const SECRET = process.env.DISCORDINVITES_WEBHOOK_SECRET;
if (!SECRET) {
  console.error('Set DISCORDINVITES_WEBHOOK_SECRET first (from /developers/webhooks).');
  process.exit(1);
}

const app = express();

// IMPORTANT: we need the raw body to verify the HMAC. JSON.parse → JSON.stringify
// round-trips lose byte-for-byte equality, so signatures would break.
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const rawBody = req.body as Buffer;
  const signature = req.header('x-discordinvites-signature');

  if (!verifyWebhookSignature(rawBody, signature, SECRET)) {
    console.warn('Rejected: bad signature');
    res.status(401).send('invalid signature');
    return;
  }

  const event = JSON.parse(rawBody.toString('utf8')) as WebhookEvent;

  switch (event.type) {
    case 'vote.created':
      console.log(
        `[vote] ${event.data.voter.name} voted for ${event.data.server.name} — total ${event.data.totalVotes}`,
      );
      break;

    case 'server.bumped':
      console.log(`[bump] ${event.data.server.name} now has ${event.data.bumps} bumps`);
      break;

    case 'review.created':
      console.log(
        `[review] ${event.data.review.authorName} rated ${event.data.server.name} ${event.data.review.rating}★ — "${event.data.review.comment.slice(0, 60)}"`,
      );
      break;

    case 'test.ping':
      console.log(`[ping] ${event.data.message}`);
      break;
  }

  // Respond 2xx within 10 seconds or the delivery is treated as failed and retried.
  res.status(200).send('ok');
});

const port = Number(process.env.PORT ?? 3030);
app.listen(port, () => {
  console.log(`Webhook receiver listening on http://localhost:${port}/webhook`);
});
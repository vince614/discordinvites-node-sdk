import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify the HMAC-SHA256 signature of an incoming webhook request.
 *
 * Important: pass the **raw request body** (a `Buffer` or the exact JSON string as received)
 * — not the parsed object. `JSON.parse` then `JSON.stringify` will NOT give the same bytes
 * the server signed. With Express use `express.raw({ type: 'application/json' })`; with Fastify
 * use `rawBody: true`; with Next.js route handlers use `await req.text()` before parsing.
 *
 * Constant-time comparison protects against timing oracles.
 *
 * @param rawBody      Raw request body — exactly the bytes received.
 * @param signature    Value of the `X-DiscordInvites-Signature` header (e.g. `sha256=…`).
 * @param secret       The `di_whsec_…`-style secret returned at webhook creation.
 * @returns `true` if the signature matches, `false` otherwise.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string | null | undefined,
  secret: string,
): boolean {
  if (!signature || typeof signature !== 'string' || !signature.startsWith('sha256=')) {
    return false;
  }

  const provided = signature.slice('sha256='.length);

  // The server signs using the SHA-256 hash of the secret as the HMAC key (the plain secret is
  // never stored server-side). Re-derive the same key here and compute the HMAC.
  const secretHash = createHash('sha256').update(secret).digest('hex');
  const mac = createHmac('sha256', secretHash).update(rawBody).digest('hex');

  // timingSafeEqual rejects buffers of different lengths — pad/normalize first.
  const a = Buffer.from(provided, 'hex');
  const b = Buffer.from(mac, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

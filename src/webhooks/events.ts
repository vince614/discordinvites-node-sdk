/**
 * Typed payloads for every event the public webhook system can deliver.
 *
 * `WebhookEvent` is a discriminated union on `type` — so in a receiver you can narrow:
 *
 * ```ts
 * switch (event.type) {
 *   case 'vote.created': // event.data.voter is typed
 *   case 'server.bumped': // event.data.bumps is typed
 * }
 * ```
 */

export type WebhookEventType =
  | 'vote.created'
  | 'server.bumped'
  | 'review.created'
  | 'test.ping';

export interface ServerSummary {
  guildId: string;
  name: string;
  iconUrl: string | null;
}

export interface BaseEvent<T extends WebhookEventType, D> {
  /** ULID event id; stable across retries so you can dedupe on it. */
  id: string;
  type: T;
  /** ISO-8601 timestamp when the event was emitted (not when it was delivered). */
  createdAt: string;
  data: D;
}

export type VoteCreatedEvent = BaseEvent<
  'vote.created',
  {
    server: ServerSummary;
    voter: { discordId: string; name: string };
    votes: number;
    totalVotes: number;
  }
>;

export type ServerBumpedEvent = BaseEvent<
  'server.bumped',
  { server: ServerSummary; bumps: number }
>;

export type ReviewCreatedEvent = BaseEvent<
  'review.created',
  {
    server: ServerSummary;
    review: {
      id: number;
      authorDiscordId: string;
      authorName: string;
      rating: number;
      comment: string;
    };
  }
>;

export type TestPingEvent = BaseEvent<'test.ping', { message: string }>;

export type WebhookEvent =
  | VoteCreatedEvent
  | ServerBumpedEvent
  | ReviewCreatedEvent
  | TestPingEvent;
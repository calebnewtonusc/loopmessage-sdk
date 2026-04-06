import type { HttpClientConfig } from "./http.ts";
import { HttpClient } from "./http.ts";
import { AudienceResource } from "./resources/audience.ts";
import { CampaignsResource } from "./resources/campaigns.ts";
import { MessagesResource } from "./resources/messages.ts";
import { OptInResource } from "./resources/opt-in.ts";
import { PoolsResource } from "./resources/pools.ts";
import { SendersResource } from "./resources/senders.ts";

export interface LoopMessageClientConfig extends HttpClientConfig {
  /**
   * Default sender ID to use when no sender is specified in send calls.
   * Can be overridden per-call.
   */
  defaultSender?: string;
}

/**
 * Loop Message API client.
 *
 * Covers the full API surface:
 * - client.messages  — send, voice, reaction, typing, status
 * - client.audience  — list contacts, check status, unsubscribe, message history
 * - client.campaigns — create bulk campaigns
 * - client.senders   — list sender names
 * - client.pools     — list sender pools
 * - client.optIn     — generate opt-in URLs
 *
 * @example
 * import { LoopMessageClient } from '@loopmessagesdk/loopmessage-sdk'
 *
 * const client = new LoopMessageClient({
 *   apiKey: process.env.LOOP_API_KEY!,
 *   defaultSender: process.env.LOOP_SENDER_ID,
 * })
 *
 * // Send a message
 * const { message_id } = await client.messages.send({
 *   contact: '+13231112233',
 *   text: 'hey',
 * })
 *
 * // Check delivery
 * const { status } = await client.messages.getStatus(message_id)
 *
 * // Show typing before replying
 * await client.messages.showTyping({ message_id: inboundId, typing: 3 })
 *
 * // React to a message
 * await client.messages.sendReaction({ contact: '+13231112233', message_id: 'uuid', reaction: 'love' })
 *
 * // Audience
 * const { items } = await client.audience.list({ per_page: 100 })
 * const { status } = await client.audience.checkStatus('+13231112233')
 *
 * // Campaign blast
 * await client.campaigns.create({
 *   name: 'April drop',
 *   text: 'New drop just landed',
 *   contacts: ['+13231112233', '+13232223344'],
 * })
 */
export class LoopMessageClient {
  /** Raw HTTP client — available for advanced use cases */
  readonly http: HttpClient;

  /** Default sender ID (set in constructor, overridden per-call) */
  readonly defaultSender: string | undefined;

  /** Messaging operations */
  readonly messages: MessagesResource;

  /** Contact / audience management */
  readonly audience: AudienceResource;

  /** Bulk campaigns */
  readonly campaigns: CampaignsResource;

  /** Sender name management */
  readonly senders: SendersResource;

  /** Sender pool management */
  readonly pools: PoolsResource;

  /** Opt-in link generation */
  readonly optIn: OptInResource;

  constructor(config: LoopMessageClientConfig) {
    this.http = new HttpClient(config);
    this.defaultSender = config.defaultSender;

    this.messages = new MessagesResource(this.http);
    this.audience = new AudienceResource(this.http);
    this.campaigns = new CampaignsResource(this.http);
    this.senders = new SendersResource(this.http);
    this.pools = new PoolsResource(this.http);
    this.optIn = new OptInResource(this.http);
  }
}

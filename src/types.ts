// ─── Primitives ────────────────────────────────────────────────────────────────

export type Channel = "imessage" | "sms" | "rcs" | "whatsapp";

export type Effect =
  | "slam"
  | "loud"
  | "gentle"
  | "invisibleInk"
  | "echo"
  | "spotlight"
  | "balloons"
  | "confetti"
  | "love"
  | "lasers"
  | "fireworks"
  | "shootingStar"
  | "celebration";

export type Reaction =
  | "love"
  | "like"
  | "dislike"
  | "laugh"
  | "emphasize"
  | "question"
  | "-love"
  | "-like"
  | "-dislike"
  | "-laugh"
  | "-emphasize"
  | "-question";

export type MessageStatus = "processing" | "delivered" | "failed" | "unknown";

export type AudienceStatus = "active" | "unsubscribed" | "unknown";

export type SenderStatus = "active" | "pending" | "canceled" | "suspended";

export type MessageType =
  | "text"
  | "reaction"
  | "audio"
  | "attachments"
  | "sticker"
  | "location";

export type MessageDirection = "inbound" | "outbound";

// ─── Pagination ────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  per_page?: number;
  sort_by?: "asc" | "desc";
  from_date?: string; // YYYY-MM-DD
  to_date?: string; // YYYY-MM-DD
}

export interface PaginatedResponse<T> {
  page: number;
  num_pages: number;
  per_page: number;
  count: number;
  items: T[];
}

// ─── Send Message ──────────────────────────────────────────────────────────────

export interface SendMessageParams {
  /** Phone number, email address, or Contact ID */
  contact: string;
  /** Message body */
  text: string;
  /** Bold title shown above text (iMessage only) */
  subject?: string;
  /** Sender name ID to send from */
  sender?: string;
  /** HTTPS image URLs. Max 3, max 256 chars each */
  attachments?: string[];
  /** iMessage screen/bubble effect */
  effect?: Effect;
  /** message_id of the message you are replying to */
  reply_to_id?: string;
  /** Metadata echoed in all related webhooks (max 1000 chars) */
  passthrough?: string;
  /** Delivery channel. Defaults to imessage */
  channel?: Channel;
  /** Attach a vCard for this contact */
  contact_file?: boolean;
}

export interface SendMessageResponse {
  message_id: string;
  contact: string;
  text: string;
}

// ─── Send Group Message ────────────────────────────────────────────────────────

export interface SendGroupMessageParams {
  /** iMessage group GUID. Obtain from a message_inbound webhook */
  group: string;
  text: string;
  subject?: string;
  sender?: string;
  /** HTTPS image URLs. Max 3 */
  attachments?: string[];
  effect?: Effect;
  reply_to_id?: string;
  passthrough?: string;
}

export interface GroupInfo {
  id: string;
  name: string;
  participants: string[];
}

export interface SendGroupMessageResponse {
  message_id: string;
  group: GroupInfo;
  text: string;
}

// ─── Send Voice Message ────────────────────────────────────────────────────────

export interface SendVoiceMessageParams {
  /** Phone number or email */
  contact: string;
  /** HTTPS URL of audio file. Formats: mp3, wav, m4a, caf, aac. Max 256 chars */
  media_url: string;
  /** Sender name ID */
  sender?: string;
  /** Metadata echoed in webhooks (max 1000 chars) */
  passthrough?: string;
}

export interface SendVoiceMessageResponse {
  message_id: string;
  recipient: string;
  text: string;
}

// ─── Send Reaction ─────────────────────────────────────────────────────────────

export interface SendReactionParams {
  /** Phone number or email */
  contact: string;
  /** message_id from webhook */
  message_id: string;
  /** Prefix with - to remove an existing reaction */
  reaction: Reaction;
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

export interface ShowTypingByMessageIdParams {
  /** message_id from an inbound webhook. The SDK routes to the correct sender automatically */
  message_id: string;
  /** Duration to show typing in seconds (max 60) */
  typing?: number;
  /** Mark conversation as read */
  read?: boolean;
  /** Blocked: use message_id OR contact+sender, not both */
  contact?: never;
  /** Blocked: use message_id OR contact+sender, not both */
  sender?: never;
}

export interface ShowTypingByContactParams {
  /** Phone number or email */
  contact: string;
  /** Required when using contact instead of message_id */
  sender: string;
  /** Duration to show typing in seconds (max 60) */
  typing?: number;
  /** Mark conversation as read */
  read?: boolean;
  /** Blocked: use message_id OR contact+sender, not both */
  message_id?: never;
}

export type ShowTypingParams =
  | ShowTypingByMessageIdParams
  | ShowTypingByContactParams;

// ─── Message Status ────────────────────────────────────────────────────────────

export interface MessageStatusResponse {
  message_id: string;
  status: MessageStatus;
  contact: string;
  text: string;
  /** Present when status is failed */
  error_code?: number;
  last_update: string; // ISO 8601
}

// ─── Audience ─────────────────────────────────────────────────────────────────

export interface AudienceListParams extends PaginationParams {
  /** Filter by phone number or email */
  search?: string;
}

export interface AudienceItem {
  id: string;
  /** Phone number or email */
  value: string;
}

export type AudienceListResponse = PaginatedResponse<AudienceItem>;

export interface AudienceStatusResponse {
  status: AudienceStatus;
}

// ─── Message History ──────────────────────────────────────────────────────────

export interface MessageHistoryParams extends PaginationParams {
  direction?: MessageDirection;
  type?: string;
}

export interface MessageHistoryItem {
  id: string;
  create_date: string; // ISO 8601
  channel: Channel;
  direction: MessageDirection;
  language: string;
  type: MessageType;
  text: string;
}

export interface MessageHistoryResponse extends PaginatedResponse<MessageHistoryItem> {
  /** Opt-in status of this contact */
  status: AudienceStatus;
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export interface CampaignMessage {
  text: string;
  contact: string;
  attachments?: string[];
}

/** Shared scheduling/display fields for both campaign modes */
interface CampaignBaseParams {
  name: string;
  attachments?: string[];
  from_date?: string; // YYYY-MM-DD
  from_time?: string; // HH:mm, default 10:00
  to_time?: string; // HH:mm, default 22:00
  timezone?: string; // TZ identifier, default America/New_York
  effect?: Effect;
  /** Subject line (iMessage only) */
  subject?: string;
}

/** Broadcast the same text to all contacts */
export interface BroadcastCampaignParams extends CampaignBaseParams {
  text: string;
  contacts: string[];
  /** Blocked to prevent passing both modes at once */
  messages?: never;
}

/** Send individualized messages (different text per contact) */
export interface IndividualizedCampaignParams extends CampaignBaseParams {
  messages: CampaignMessage[];
  /** Blocked to prevent passing both modes at once */
  text?: never;
  contacts?: never;
}

export type CreateCampaignParams =
  | BroadcastCampaignParams
  | IndividualizedCampaignParams;

export interface CreateCampaignResponse {
  id: string;
  name: string;
  api_key: string;
  create_date: string; // ISO 8601
}

// ─── Opt-in ───────────────────────────────────────────────────────────────────

export interface GenerateOptInUrlParams {
  /** Message text. Must contain [opt-in-code] which is replaced with the unique code */
  body: string;
  /** Pre-fill recipient (phone or email) */
  contact?: string;
  click_id?: string;
  utm_campaign?: string;
  utm_medium?: string;
  /** Any additional custom fields, echoed in the opt-in webhook */
  [key: string]: string | undefined;
}

export interface GenerateOptInUrlResponse {
  id: string;
  /** imessage:// deep link (iOS 13+) */
  imessage: string;
  /** sms:// URI (iOS 12 and below) */
  sms: string;
  /** Universal HTTPS URL */
  url: string;
}

// ─── Senders ──────────────────────────────────────────────────────────────────

export interface SenderListParams {
  page?: number;
  per_page?: number;
  sort_by?: "asc" | "desc";
}

export interface SenderItem {
  id: string;
  name: string;
  status: SenderStatus;
  create_date: string; // ISO 8601
  imessage_link: string;
}

export type SenderListResponse = PaginatedResponse<SenderItem>;

// ─── Pools ────────────────────────────────────────────────────────────────────

export interface PoolListParams {
  page?: number;
  per_page?: number;
  sort_by?: "asc" | "desc";
}

export interface PoolItem {
  id: string;
  name: string;
  count: number;
  create_date: string; // ISO 8601
}

export type PoolListResponse = PaginatedResponse<PoolItem>;

// ─── Webhook Payloads ─────────────────────────────────────────────────────────

export type WebhookEventType =
  | "opt-in"
  | "message_failed"
  | "message_delivered"
  | "message_inbound"
  | "message_reaction"
  | "inbound_call"
  | "sender_name_updated"
  | "unknown";

export interface WebhookLanguage {
  code: string;
  name: string;
}

export interface WebhookGroup {
  id: string;
  name?: string;
  participants?: string[];
}

export interface WebhookSpeech {
  text?: string;
  confidence?: number;
}

interface BaseWebhookPayload {
  webhook_id: string;
  event: WebhookEventType;
  api_version: string;
}

export interface MessageInboundPayload extends BaseWebhookPayload {
  event: "message_inbound";
  message_id: string;
  contact: string;
  text: string;
  message_type: MessageType;
  channel: Channel;
  sender?: string;
  subject?: string;
  attachments?: string[];
  thread_id?: string;
  language?: WebhookLanguage;
  group?: WebhookGroup;
  speech?: WebhookSpeech;
  passthrough?: string;
}

export interface MessageDeliveredPayload extends BaseWebhookPayload {
  event: "message_delivered";
  message_id: string;
  contact: string;
  text: string;
  sender?: string;
  passthrough?: string;
}

export interface MessageFailedPayload extends BaseWebhookPayload {
  event: "message_failed";
  message_id: string;
  contact: string;
  text: string;
  error_code: number;
  sender?: string;
  passthrough?: string;
}

export interface MessageReactionPayload extends BaseWebhookPayload {
  event: "message_reaction";
  message_id: string;
  contact: string;
  text: string;
  message_type: "reaction";
  channel: Channel;
  sender?: string;
  passthrough?: string;
}

export interface OptInPayload extends BaseWebhookPayload {
  event: "opt-in";
  message_id: string;
  contact: string;
  sender?: string;
  [key: string]: unknown;
}

export interface InboundCallPayload extends BaseWebhookPayload {
  event: "inbound_call";
  contact: string;
  sender?: string;
}

export interface SenderNameUpdatedPayload extends BaseWebhookPayload {
  event: "sender_name_updated";
  organization_id: string;
  phone_number: string;
  sender: string;
  status: SenderStatus;
}

export interface UnknownEventPayload extends BaseWebhookPayload {
  event: "unknown";
  [key: string]: unknown;
}

export type WebhookPayload =
  | MessageInboundPayload
  | MessageDeliveredPayload
  | MessageFailedPayload
  | MessageReactionPayload
  | OptInPayload
  | InboundCallPayload
  | SenderNameUpdatedPayload
  | UnknownEventPayload;

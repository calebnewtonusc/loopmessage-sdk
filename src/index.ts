// Main client
export { LoopMessageClient } from "./client.ts";
export type { LoopMessageClientConfig } from "./client.ts";

// Errors
export {
  LoopMessageError,
  ERROR_MESSAGES,
  RETRYABLE_CODES,
  FATAL_CODES,
} from "./errors.ts";

// Webhook utilities
export {
  parseWebhook,
  dispatchWebhook,
  createWebhookHandler,
  createNodeWebhookHandler,
  // Type guards
  isMessageInbound,
  isMessageDelivered,
  isMessageFailed,
  isMessageReaction,
  isOptIn,
  isInboundCall,
  isSenderNameUpdated,
  isUnknownEvent,
} from "./webhook.ts";
export type { WebhookHandlers, WebhookServerOptions } from "./webhook.ts";

// All types — re-exported for convenience
export type {
  // Primitives
  Channel,
  Effect,
  Reaction,
  MessageStatus,
  AudienceStatus,
  SenderStatus,
  MessageType,
  MessageDirection,
  // Pagination
  PaginationParams,
  PaginatedResponse,
  // Messages
  SendMessageParams,
  SendMessageResponse,
  SendGroupMessageParams,
  SendGroupMessageResponse,
  GroupInfo,
  SendVoiceMessageParams,
  SendVoiceMessageResponse,
  SendReactionParams,
  ShowTypingParams,
  ShowTypingByMessageIdParams,
  ShowTypingByContactParams,
  MessageStatusResponse,
  // Audience
  AudienceListParams,
  AudienceListResponse,
  AudienceItem,
  AudienceStatusResponse,
  MessageHistoryParams,
  MessageHistoryItem,
  MessageHistoryResponse,
  // Campaigns
  CampaignMessage,
  CreateCampaignParams,
  BroadcastCampaignParams,
  IndividualizedCampaignParams,
  CreateCampaignResponse,
  // Opt-in
  GenerateOptInUrlParams,
  GenerateOptInUrlResponse,
  // Senders
  SenderListParams,
  SenderItem,
  SenderListResponse,
  // Pools
  PoolListParams,
  PoolItem,
  PoolListResponse,
  // Webhooks
  WebhookEventType,
  WebhookPayload,
  WebhookLanguage,
  WebhookGroup,
  WebhookSpeech,
  MessageInboundPayload,
  MessageDeliveredPayload,
  MessageFailedPayload,
  MessageReactionPayload,
  OptInPayload,
  InboundCallPayload,
  SenderNameUpdatedPayload,
  UnknownEventPayload,
} from "./types.ts";

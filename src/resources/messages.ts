import type { HttpClient } from "../http.ts";
import type {
  MessageStatusResponse,
  SendGroupMessageParams,
  SendGroupMessageResponse,
  SendMessageParams,
  SendMessageResponse,
  SendReactionParams,
  SendVoiceMessageParams,
  SendVoiceMessageResponse,
  ShowTypingByContactParams,
  ShowTypingByMessageIdParams,
  ShowTypingParams,
} from "../types.ts";

/**
 * All messaging operations — send, react, type, voice, status.
 * Access via client.messages
 */
export class MessagesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Send a text message to a single contact (phone or email).
   *
   * @example
   * await client.messages.send({ contact: '+13231112233', text: 'Hey!' })
   * await client.messages.send({ contact: '+13231112233', text: 'Boom', effect: 'fireworks' })
   * await client.messages.send({ contact: '+13231112233', text: 'See attachment', attachments: ['https://example.com/img.jpg'] })
   */
  send(params: SendMessageParams): Promise<SendMessageResponse> {
    return this.http.post<SendMessageResponse>("/api/v1/message/send/", params);
  }

  /**
   * Send a text message to an iMessage group.
   * The group ID must be obtained from a message_inbound webhook.
   *
   * @example
   * await client.messages.sendGroup({ group: 'group-uuid', text: 'Hello everyone!' })
   */
  sendGroup(params: SendGroupMessageParams): Promise<SendGroupMessageResponse> {
    return this.http.post<SendGroupMessageResponse>(
      "/api/v1/message/send/",
      params,
    );
  }

  /**
   * Send a voice message (audio file) to a contact.
   * Supported formats: mp3, wav, m4a, caf, aac.
   *
   * @example
   * await client.messages.sendVoice({ contact: '+13231112233', media_url: 'https://example.com/audio.m4a' })
   */
  sendVoice(params: SendVoiceMessageParams): Promise<SendVoiceMessageResponse> {
    return this.http.post<SendVoiceMessageResponse>(
      "/api/v1/message/send/",
      params,
    );
  }

  /**
   * React to a message (or remove a reaction by prefixing with -).
   * Use the message_id from a message_inbound webhook.
   *
   * @example
   * await client.messages.sendReaction({ contact: '+13231112233', message_id: 'uuid', reaction: 'love' })
   * await client.messages.sendReaction({ contact: '+13231112233', message_id: 'uuid', reaction: '-love' }) // removes
   */
  sendReaction(params: SendReactionParams): Promise<void> {
    return this.http.post<void>("/api/v1/message/send/", params);
  }

  /**
   * Show a typing indicator and/or mark a conversation as read.
   *
   * Pass message_id (from webhook) to auto-route to the correct sender,
   * or pass contact + sender explicitly.
   *
   * @example
   * // Auto-route via message_id
   * await client.messages.showTyping({ message_id: 'uuid', typing: 5 })
   * // Explicit
   * await client.messages.showTyping({ contact: '+13231112233', sender: 'sender-id', typing: 3, read: true })
   */
  showTyping(params: ShowTypingParams): Promise<void> {
    return this.http.post<void>("/api/v1/message/show-typing/", params);
  }

  /**
   * Mark a conversation as read without showing a typing indicator.
   * Shorthand for showTyping with read: true.
   */
  markRead(
    params:
      | ShowTypingByMessageIdParams
      | Omit<ShowTypingByContactParams, "typing">,
  ): Promise<void> {
    return this.showTyping({ ...params, read: true } as ShowTypingParams);
  }

  /**
   * Check the delivery status of a sent message.
   * Returns: processing | delivered | failed | unknown
   *
   * @example
   * const status = await client.messages.getStatus('message-uuid')
   * if (status.status === 'failed') console.error('Error code:', status.error_code)
   */
  getStatus(messageId: string): Promise<MessageStatusResponse> {
    // Note: status endpoint uses /v1/ not /api/v1/
    return this.http.get<MessageStatusResponse>(
      `/v1/message/status/${encodeURIComponent(messageId)}/`,
    );
  }
}

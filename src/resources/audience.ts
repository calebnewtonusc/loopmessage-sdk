import type { HttpClient } from "../http.ts";
import type {
  AudienceListParams,
  AudienceListResponse,
  AudienceStatusResponse,
  MessageHistoryParams,
  MessageHistoryResponse,
} from "../types.ts";

/**
 * Contact (audience) management.
 * Access via client.audience
 */
export class AudienceResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List all contacts in your audience.
   *
   * @example
   * const { items, count } = await client.audience.list({ per_page: 100 })
   * const page2 = await client.audience.list({ page: 2, search: '+13231112233' })
   */
  list(params: AudienceListParams = {}): Promise<AudienceListResponse> {
    return this.http.get<AudienceListResponse>("/api/v1/audience/list/", {
      page: params.page,
      per_page: params.per_page,
      sort_by: params.sort_by,
      from_date: params.from_date,
      to_date: params.to_date,
      search: params.search,
    });
  }

  /**
   * Check whether a contact is active, unsubscribed, or unknown.
   *
   * @example
   * const { status } = await client.audience.checkStatus('+13231112233')
   * // status: 'active' | 'unsubscribed' | 'unknown'
   */
  checkStatus(contact: string): Promise<AudienceStatusResponse> {
    return this.http.get<AudienceStatusResponse>(
      `/api/v1/audience/check-status/${encodeURIComponent(contact)}/`,
    );
  }

  /**
   * Unsubscribe (remove) a contact from your audience.
   * Phone numbers must be in international E.164 format (+13231112233).
   *
   * @example
   * await client.audience.unsubscribe('+13231112233')
   */
  unsubscribe(contact: string): Promise<void> {
    return this.http.delete<void>(
      `/api/v1/audience/delete/${encodeURIComponent(contact)}/`,
    );
  }

  /**
   * Retrieve the full message history for a contact.
   * Includes inbound and outbound messages.
   * Response also contains the contact's current opt-in status.
   *
   * @example
   * const history = await client.audience.messageHistory('+13231112233', { direction: 'inbound', per_page: 50 })
   */
  messageHistory(
    contact: string,
    params: MessageHistoryParams = {},
  ): Promise<MessageHistoryResponse> {
    return this.http.get<MessageHistoryResponse>(
      `/api/v1/audience/messages/${encodeURIComponent(contact)}/`,
      {
        page: params.page,
        per_page: params.per_page,
        sort_by: params.sort_by,
        from_date: params.from_date,
        to_date: params.to_date,
        direction: params.direction,
        type: params.type,
      },
    );
  }
}

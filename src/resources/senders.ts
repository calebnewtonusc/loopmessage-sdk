import type { HttpClient } from "../http.ts";
import type { SenderListParams, SenderListResponse } from "../types.ts";

/**
 * Sender name management.
 * Access via client.senders
 */
export class SendersResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List all sender names in your organization.
   * Returns pagination metadata + array of sender objects.
   *
   * @example
   * const { items } = await client.senders.list()
   * const activeSenders = items.filter(s => s.status === 'active')
   */
  list(params: SenderListParams = {}): Promise<SenderListResponse> {
    return this.http.get<SenderListResponse>("/api/v1/sender/list/", {
      page: params.page,
      per_page: params.per_page,
      sort_by: params.sort_by,
    });
  }
}

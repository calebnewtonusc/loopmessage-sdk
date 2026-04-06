import type { HttpClient } from "../http.ts";
import type {
  SenderItem,
  SenderListParams,
  SenderListResponse,
} from "../types.ts";

/**
 * Sender name management.
 * Access via client.senders
 */
export class SendersResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List one page of sender names in your organization.
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

  /**
   * Async generator that yields all senders across all pages automatically.
   *
   * @example
   * for await (const page of client.senders.listAll()) {
   *   for (const sender of page) console.log(sender.name, sender.status);
   * }
   */
  listAll(
    params: Omit<SenderListParams, "page"> = {},
  ): AsyncGenerator<SenderItem[]> {
    return this.http.paginate<SenderItem>("/api/v1/sender/list/", {
      per_page: params.per_page ?? 100,
      sort_by: params.sort_by,
    });
  }
}

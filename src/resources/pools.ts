import type { HttpClient } from "../http.ts";
import type { PoolListParams, PoolListResponse } from "../types.ts";

/**
 * Sender pool management.
 * Access via client.pools
 */
export class PoolsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List all sender pools in your organization.
   *
   * @example
   * const { items } = await client.pools.list()
   */
  list(params: PoolListParams = {}): Promise<PoolListResponse> {
    return this.http.get<PoolListResponse>("/api/v1/pool/list/", {
      page: params.page,
      per_page: params.per_page,
      sort_by: params.sort_by,
    });
  }
}

import type { HttpClient } from "../http.ts";
import type { PoolItem, PoolListParams, PoolListResponse } from "../types.ts";

/**
 * Sender pool management.
 * Access via client.pools
 */
export class PoolsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List one page of sender pools in your organization.
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

  /**
   * Async generator that yields all pools across all pages automatically.
   *
   * @example
   * for await (const page of client.pools.listAll()) {
   *   for (const pool of page) console.log(pool.name, pool.count);
   * }
   */
  listAll(
    params: Omit<PoolListParams, "page"> = {},
  ): AsyncGenerator<PoolItem[]> {
    return this.http.paginate<PoolItem>("/api/v1/pool/list/", {
      per_page: params.per_page ?? 100,
      sort_by: params.sort_by,
    });
  }
}

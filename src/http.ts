import { LoopMessageError, RETRYABLE_CODES, throwApiError } from "./errors.ts";
import type { PaginatedResponse } from "./types.ts";

export interface HttpClientConfig {
  /** Your Organization API Key. No Bearer prefix needed */
  apiKey: string;
  /**
   * Override the base URL. Defaults to https://a.loopmessage.com
   * Useful for testing against a local mock server.
   */
  baseUrl?: string;
  /** Request timeout in ms. Default: 15_000 */
  timeout?: number;
  /** Max retry attempts for retryable errors (1010, 1020, 1030). Default: 2 */
  retries?: number;
  /** Base delay between retries in ms, multiplied by attempt number. Default: 2_000 */
  retryDelay?: number;
}

type QueryValue = string | number | boolean | undefined | null;

export class HttpClient {
  readonly apiKey: string;
  readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retries: number;
  private readonly retryDelay: number;

  constructor(config: HttpClientConfig) {
    if (!config.apiKey?.trim())
      throw new Error("[LoopMessage] apiKey is required");
    this.apiKey = config.apiKey.trim();
    this.baseUrl = (config.baseUrl ?? "https://a.loopmessage.com").replace(
      /\/$/,
      "",
    );
    this.timeout = config.timeout ?? 15_000;
    this.retries = config.retries ?? 2;
    this.retryDelay = config.retryDelay ?? 2_000;
  }

  private buildUrl(path: string, query?: Record<string, QueryValue>): string {
    const url = `${this.baseUrl}${path}`;
    if (!query) return url;
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.set(k, String(v));
    }
    const qs = params.toString();
    return qs ? `${url}?${qs}` : url;
  }

  private async execute<T>(
    method: string,
    url: string,
    body?: unknown,
  ): Promise<T> {
    const r = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: this.apiKey, // docs: no Bearer/Basic prefix
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(this.timeout),
    });

    // 204 No Content (DELETE success)
    if (r.status === 204) return undefined as T;

    // 404 (resource not found)
    if (r.status === 404) {
      throw new LoopMessageError("Not found", 100, 404);
    }

    let data: unknown;
    const contentType = r.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      data = await r.json();
    } else {
      const text = await r.text();
      data = text ? { message: text } : {};
    }

    if (!r.ok) throwApiError(data, r.status);

    return data as T;
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: LoopMessageError | null = null;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (
          err instanceof LoopMessageError &&
          RETRYABLE_CODES.has(err.code) &&
          attempt < this.retries
        ) {
          lastError = err;
          await new Promise((r) =>
            setTimeout(r, this.retryDelay * (attempt + 1)),
          );
          continue;
        }
        throw err;
      }
    }
    throw lastError!;
  }

  async get<T>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    const url = this.buildUrl(path, query);
    return this.withRetry(() => this.execute<T>("GET", url));
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.withRetry(() => this.execute<T>("POST", url, body));
  }

  async delete<T = void>(path: string): Promise<T> {
    const url = this.buildUrl(path);
    return this.withRetry(() => this.execute<T>("DELETE", url));
  }

  /**
   * Async generator that pages through a paginated list endpoint.
   * Each iteration yields the items array for one page.
   *
   * @example
   * for await (const pageItems of http.paginate('/api/v1/audience/list/')) {
   *   for (const item of pageItems) console.log(item);
   * }
   */
  async *paginate<T>(
    path: string,
    params: Record<string, QueryValue> = {},
    options: { maxPages?: number } = {},
  ): AsyncGenerator<T[]> {
    const { maxPages = Infinity } = options;
    let page = 1;

    while (page <= maxPages) {
      const result = await this.get<PaginatedResponse<T>>(path, {
        ...params,
        page,
      });
      yield result.items;
      if (page >= result.num_pages) break;
      page++;
    }
  }
}

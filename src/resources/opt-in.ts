import type { HttpClient } from "../http.ts";
import type {
  GenerateOptInUrlParams,
  GenerateOptInUrlResponse,
} from "../types.ts";
import { validateOptInBody } from "../validate.ts";

/**
 * Opt-in link generation.
 * Access via client.optIn
 */
export class OptInResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Generate a unique opt-in URL for a contact.
   *
   * The body MUST contain the placeholder [opt-in-code] — the API replaces it
   * with a unique verification code the contact sends back to complete opt-in.
   * This is validated before the request is made.
   *
   * Returns three link formats:
   * - imessage:// — deep links into Messages.app (iOS 13+)
   * - sms://       — fallback for older iOS
   * - url          — universal HTTPS link (works anywhere)
   *
   * Any extra fields on the params object are passed through and echoed
   * in the opt-in webhook when the contact completes opt-in.
   *
   * @example
   * const links = await client.optIn.generateUrl({
   *   body: 'Hey! Reply with [opt-in-code] to subscribe.',
   *   contact: '+13231112233',
   *   utm_campaign: 'spring-launch',
   * })
   * // links.url => send this to user
   * // links.imessage => iOS deep link
   */
  generateUrl(
    params: GenerateOptInUrlParams,
  ): Promise<GenerateOptInUrlResponse> {
    validateOptInBody(params.body);
    return this.http.post<GenerateOptInUrlResponse>(
      "/api/v1/opt-in/generate-url/",
      params,
    );
  }
}

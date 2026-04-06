import { LoopMessageError } from "./errors.ts";

function invalid(message: string): never {
  throw new LoopMessageError(message, 100, 400);
}

/**
 * Attachments: max 3, each must be HTTPS, max 256 chars.
 */
export function validateAttachments(attachments: string[] | undefined): void {
  if (!attachments || attachments.length === 0) return;

  if (attachments.length > 3) {
    invalid(`attachments: max 3 URLs allowed, got ${attachments.length}`);
  }
  for (let i = 0; i < attachments.length; i++) {
    const url = attachments[i]!;
    if (!url.startsWith("https://")) {
      invalid(
        `attachments[${i}]: URL must start with https:// (got "${url.slice(0, 50)}")`,
      );
    }
    if (url.length > 256) {
      invalid(`attachments[${i}]: URL must be ≤256 chars, got ${url.length}`);
    }
  }
}

/**
 * passthrough: max 1000 chars.
 */
export function validatePassthrough(passthrough: string | undefined): void {
  if (!passthrough) return;
  if (passthrough.length > 1000) {
    invalid(`passthrough: max 1000 chars, got ${passthrough.length}`);
  }
}

/**
 * media_url: must be HTTPS, max 256 chars.
 */
export function validateMediaUrl(mediaUrl: string): void {
  if (!mediaUrl.startsWith("https://")) {
    invalid(
      `media_url must start with https:// (got "${mediaUrl.slice(0, 50)}")`,
    );
  }
  if (mediaUrl.length > 256) {
    invalid(`media_url must be ≤256 chars, got ${mediaUrl.length}`);
  }
}

/**
 * typing: must be 1–60 seconds.
 */
export function validateTyping(typing: number | undefined): void {
  if (typing === undefined) return;
  if (!Number.isInteger(typing) || typing < 1 || typing > 60) {
    invalid(`typing must be an integer between 1 and 60, got ${typing}`);
  }
}

/**
 * Opt-in body: must contain [opt-in-code] placeholder.
 */
export function validateOptInBody(body: string): void {
  if (!body.includes("[opt-in-code]")) {
    invalid(
      'opt-in body must contain the placeholder [opt-in-code] (e.g. "Reply [opt-in-code] to subscribe")',
    );
  }
}

/**
 * Date string: must match YYYY-MM-DD.
 */
export function validateDate(field: string, value: string | undefined): void {
  if (!value) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    invalid(`${field} must be YYYY-MM-DD format, got "${value}"`);
  }
}

/**
 * showTyping: runtime guard ensuring either message_id OR contact+sender is
 * present, but not both. Catches JS callers and any casts that bypass TypeScript.
 */
export function validateShowTyping(params: Record<string, unknown>): void {
  const hasMessageId = typeof params["message_id"] === "string";
  const hasContact = typeof params["contact"] === "string";

  if (hasMessageId && hasContact) {
    invalid("showTyping: provide message_id OR contact+sender, not both");
  }
  if (!hasMessageId && !hasContact) {
    invalid("showTyping: provide either message_id or contact+sender");
  }
  if (hasContact && typeof params["sender"] !== "string") {
    invalid("showTyping: sender is required when using contact");
  }
}

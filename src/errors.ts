/**
 * All known Loop Message API error codes with descriptions.
 * Source: https://docs.loopmessage.com/imessage-conversation-api/error-codes.md
 */
export const ERROR_MESSAGES: Readonly<Record<number, string>> = {
  100: "Bad request",
  110: "Missing credentials in request",
  115: "One or more required parameters are invalid",
  120: "One or more required parameters are missing",
  125: "One or more parameters in the request are invalid",
  130: "Authorization key is invalid or does not exist",
  140: "No text parameter in request",
  150: "No contact parameter in request",
  160: "Invalid contact",
  165: "Invalid group",
  170: "Invalid contact email address",
  180: "Invalid contact phone number",
  190: "A phone number is not mobile",
  200: "No conversation with sandbox contact",
  210: "Unable to get sender for this contact",
  220: "Invalid sender name",
  230: "Internal error while trying to use the specified sender name",
  240: "Sender name is not activated or unpaid",
  250: "Sender name suspended",
  260: "No active purchased sender name to send message",
  270: "This request requires a dedicated sender name",
  290: "This API request is deprecated and not supported",
  300: "Your account is suspended",
  310: "Your account is blocked",
  320: "The phone number in your account has not been verified",
  330: "Your account is suspended due to debt",
  340: "This recipient blocked any type of messages",
  500: "This contact has opted out from your messages",
  510: "No recent conversation with this contact",
  520: "Unable to send outbound messages until this recipient initiates a conversation",
  530: "Unable to init conversation with contact",
  540: "You have reached the limit of sending messages to recipients not contacted recently",
  580: "Invalid effect parameter",
  590: "Invalid message_id for reply",
  595: "Invalid or non-existent message_id",
  600: "Invalid reaction parameter",
  610: "Reaction or message_id is invalid or does not exist",
  620: "Cannot use effect and reaction parameters in the same request",
  630: "Need to set up a vCard file for this sender name in the dashboard",
  640: "No media file URL (media_url)",
  1000: "Internal error during the sending process",
  1010: "Unable to send message. Retry after a short delay",
  1020: "Message sent but destination returned Not Delivered. Retry after a delay",
  1030: "Message sent but no delivery confirmation received",
  1110: "Unable to send SMS if the recipient is an email address",
  1120: "Unable to send SMS if the recipient is a group",
  1130: "Unable to send SMS with marketing content",
  1140: "Unable to send audio messages through SMS",
} as const;

/**
 * Transient errors that are safe to retry.
 */
export const RETRYABLE_CODES = new Set([1010, 1020, 1030]);

/**
 * Auth/billing errors. Stop retrying immediately and surface to caller.
 */
export const FATAL_CODES = new Set([110, 130, 300, 310, 320, 330]);

/**
 * Structured error thrown on any non-2xx response from the Loop Message API.
 */
export class LoopMessageError extends Error {
  /** Loop Message error code (see ERROR_MESSAGES) */
  readonly code: number;
  /** HTTP status code */
  readonly httpStatus: number;
  readonly success = false as const;

  constructor(message: string, code: number, httpStatus: number) {
    super(message);
    this.name = "LoopMessageError";
    this.code = code;
    this.httpStatus = httpStatus;
    // Restore prototype chain (needed when extending Error in TypeScript)
    Object.setPrototypeOf(this, LoopMessageError.prototype);
  }

  /** True for transient send failures that should be retried */
  get isRetryable(): boolean {
    return RETRYABLE_CODES.has(this.code);
  }

  /** True for auth/billing failures. Do not retry; surface immediately */
  get isFatal(): boolean {
    return FATAL_CODES.has(this.code);
  }

  /** Human-readable description from the error code table */
  get codeDescription(): string {
    return ERROR_MESSAGES[this.code] ?? "Unknown error";
  }
}

/**
 * Parse an error response body and throw LoopMessageError.
 * Handles the two response shapes the API uses.
 */
export function throwApiError(body: unknown, httpStatus: number): never {
  const b = body as Record<string, unknown>;
  const code = typeof b?.code === "number" ? b.code : 100;
  const message =
    typeof b?.message === "string"
      ? b.message
      : (ERROR_MESSAGES[code] ?? "Unknown error");
  throw new LoopMessageError(message, code, httpStatus);
}

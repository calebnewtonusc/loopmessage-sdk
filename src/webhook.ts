import { LoopMessageError } from "./errors.ts";
import type {
  InboundCallPayload,
  MessageDeliveredPayload,
  MessageFailedPayload,
  MessageInboundPayload,
  MessageReactionPayload,
  OptInPayload,
  SenderNameUpdatedPayload,
  UnknownEventPayload,
  WebhookPayload,
} from "./types.ts";

// ─── Type Guards ───────────────────────────────────────────────────────────────

export function isMessageInbound(
  p: WebhookPayload,
): p is MessageInboundPayload {
  return p.event === "message_inbound";
}

export function isMessageDelivered(
  p: WebhookPayload,
): p is MessageDeliveredPayload {
  return p.event === "message_delivered";
}

export function isMessageFailed(p: WebhookPayload): p is MessageFailedPayload {
  return p.event === "message_failed";
}

export function isMessageReaction(
  p: WebhookPayload,
): p is MessageReactionPayload {
  return p.event === "message_reaction";
}

export function isOptIn(p: WebhookPayload): p is OptInPayload {
  return p.event === "opt-in";
}

export function isInboundCall(p: WebhookPayload): p is InboundCallPayload {
  return p.event === "inbound_call";
}

export function isSenderNameUpdated(
  p: WebhookPayload,
): p is SenderNameUpdatedPayload {
  return p.event === "sender_name_updated";
}

export function isUnknownEvent(p: WebhookPayload): p is UnknownEventPayload {
  return p.event === "unknown";
}

// ─── Parser ────────────────────────────────────────────────────────────────────

/**
 * Parse a raw webhook request body into a typed WebhookPayload.
 *
 * Accepts a string (raw body) or a pre-parsed object.
 * Throws LoopMessageError(code=100) on malformed input.
 *
 * @example
 * // In your Bun/Node HTTP handler:
 * const payload = parseWebhook(rawBodyString)
 * if (isMessageInbound(payload)) {
 *   console.log('Got message from', payload.contact, ':', payload.text)
 * }
 */
export function parseWebhook(
  raw: string | Record<string, unknown>,
): WebhookPayload {
  let data: Record<string, unknown>;

  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      throw new LoopMessageError(
        "Invalid webhook body: not valid JSON",
        100,
        400,
      );
    }
  } else {
    data = raw;
  }

  if (!data || typeof data !== "object") {
    throw new LoopMessageError(
      "Invalid webhook body: expected object",
      100,
      400,
    );
  }

  if (typeof data.event !== "string") {
    throw new LoopMessageError(
      "Invalid webhook body: missing event field",
      100,
      400,
    );
  }

  return data as unknown as WebhookPayload;
}

// ─── Handler Builder ───────────────────────────────────────────────────────────

export interface WebhookHandlers {
  onMessageInbound?: (payload: MessageInboundPayload) => void | Promise<void>;
  onMessageDelivered?: (
    payload: MessageDeliveredPayload,
  ) => void | Promise<void>;
  onMessageFailed?: (payload: MessageFailedPayload) => void | Promise<void>;
  onMessageReaction?: (payload: MessageReactionPayload) => void | Promise<void>;
  onOptIn?: (payload: OptInPayload) => void | Promise<void>;
  onInboundCall?: (payload: InboundCallPayload) => void | Promise<void>;
  onSenderNameUpdated?: (
    payload: SenderNameUpdatedPayload,
  ) => void | Promise<void>;
  onUnknown?: (payload: UnknownEventPayload) => void | Promise<void>;
  /** Called for every event, regardless of type — fires after the specific handler */
  onAny?: (payload: WebhookPayload) => void | Promise<void>;
}

/**
 * Route a parsed webhook payload to the correct handler.
 * Returns a promise that resolves after all handlers complete.
 *
 * @example
 * const payload = parseWebhook(body)
 * await dispatchWebhook(payload, {
 *   onMessageInbound: async ({ contact, text }) => {
 *     await sendReply(contact, `You said: ${text}`)
 *   },
 *   onMessageFailed: ({ error_code }) => {
 *     console.error('Delivery failed, code:', error_code)
 *   },
 * })
 */
export async function dispatchWebhook(
  payload: WebhookPayload,
  handlers: WebhookHandlers,
): Promise<void> {
  switch (payload.event) {
    case "message_inbound":
      await handlers.onMessageInbound?.(payload);
      break;
    case "message_delivered":
      await handlers.onMessageDelivered?.(payload);
      break;
    case "message_failed":
      await handlers.onMessageFailed?.(payload);
      break;
    case "message_reaction":
      await handlers.onMessageReaction?.(payload);
      break;
    case "opt-in":
      await handlers.onOptIn?.(payload);
      break;
    case "inbound_call":
      await handlers.onInboundCall?.(payload);
      break;
    case "sender_name_updated":
      await handlers.onSenderNameUpdated?.(payload);
      break;
    default:
      await handlers.onUnknown?.(payload as UnknownEventPayload);
      break;
  }
  await handlers.onAny?.(payload);
}

// ─── WebhookServer — Bun/Node-compatible HTTP handler ─────────────────────────

export interface WebhookServerOptions {
  /** Optional secret — if set, validates Authorization: Bearer <secret> header */
  secret?: string;
  /** Handlers to call for each event type */
  handlers: WebhookHandlers;
  /**
   * Called when an error is thrown inside a handler.
   * Defaults to console.error.
   */
  onError?: (err: unknown, payload?: WebhookPayload) => void;
}

/**
 * Build a Bun/Node-compatible fetch handler for receiving Loop Message webhooks.
 *
 * Loop Message requires a 200 response within 15 seconds.
 * This handler always returns 200 immediately after parsing,
 * then dispatches to your handlers asynchronously.
 *
 * @example
 * // Bun server
 * import { createWebhookHandler } from '@caleb/loopmessage-sdk'
 *
 * const handler = createWebhookHandler({
 *   secret: process.env.WEBHOOK_SECRET,
 *   handlers: {
 *     onMessageInbound: async ({ contact, text }) => {
 *       await client.messages.showTyping({ contact, sender: process.env.SENDER_ID!, typing: 3 })
 *       await client.messages.send({ contact, text: `Got it: ${text}` })
 *     },
 *   },
 * })
 *
 * Bun.serve({ port: 8080, fetch: handler })
 */
export function createWebhookHandler(options: WebhookServerOptions) {
  const { secret, handlers, onError = console.error } = options;

  return async function handle(req: Request): Promise<Response> {
    // Health check
    if (req.method === "GET" && new URL(req.url).pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Optional auth
    if (secret) {
      const authHeader = req.headers.get("authorization") ?? "";
      const qs = new URL(req.url).searchParams.get("secret") ?? "";
      if (authHeader !== `Bearer ${secret}` && qs !== secret) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    let rawBody: string;
    try {
      rawBody = await req.text();
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    // Parse — return 400 on malformed JSON so Loop doesn't retry forever
    let payload: WebhookPayload;
    try {
      payload = parseWebhook(rawBody);
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    // Respond 200 immediately — Loop requires < 15s response
    // Dispatch handlers asynchronously so we don't block the response
    dispatchWebhook(payload, handlers).catch((err) => onError(err, payload));

    return new Response("OK", { status: 200 });
  };
}

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
  /** Called for every event, regardless of type. Fires after the specific handler */
  onAny?: (payload: WebhookPayload) => void | Promise<void>;
}

/**
 * Route a parsed webhook payload to the correct handler.
 * Returns a promise that resolves after all handlers complete.
 *
 * onAny is guaranteed to fire after the specific handler, even if it threw.
 * If both the specific handler and onAny throw, the specific handler error
 * is preserved and re-thrown; the onAny error is discarded.
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
  let specificError: unknown;
  let hasSpecificError = false;

  try {
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
  } catch (err) {
    specificError = err;
    hasSpecificError = true;
  }

  // onAny always fires, regardless of whether the specific handler threw
  if (handlers.onAny) {
    try {
      await handlers.onAny(payload);
    } catch (anyErr) {
      // If the specific handler already threw, preserve that error
      if (!hasSpecificError) throw anyErr;
    }
  }

  if (hasSpecificError) throw specificError;
}

// ─── WebhookServer: Bun/Node-compatible HTTP handler ──────────────────────────

export interface WebhookServerOptions {
  /** Optional secret. If set, validates Authorization: Bearer <secret> header */
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
 * import { createWebhookHandler } from '@loopmessagesdk/loopmessage-sdk'
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

    // Parse: return 400 on malformed JSON so Loop does not retry forever
    let payload: WebhookPayload;
    try {
      payload = parseWebhook(rawBody);
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    // Respond 200 immediately. Loop requires < 15s response
    // Dispatch handlers asynchronously so we don't block the response
    dispatchWebhook(payload, handlers).catch((err) => onError(err, payload));

    return new Response("OK", { status: 200 });
  };
}

// ─── Node.js HTTP adapter ─────────────────────────────────────────────────────

/**
 * Build a Node.js-compatible request handler for receiving Loop Message webhooks.
 * Use with `http.createServer` or any Express-like framework.
 *
 * @example
 * import http from 'node:http'
 * import { createNodeWebhookHandler } from '@loopmessagesdk/loopmessage-sdk'
 *
 * const handler = createNodeWebhookHandler({
 *   secret: process.env.WEBHOOK_SECRET,
 *   handlers: {
 *     onMessageInbound: async ({ contact, text }) => {
 *       await client.messages.send({ contact, text: `got: ${text}` })
 *     },
 *   },
 * })
 *
 * http.createServer(handler).listen(8080)
 *
 * // Express
 * app.post('/webhook', (req, res) => handler(req as any, res as any))
 */
export function createNodeWebhookHandler(options: WebhookServerOptions) {
  const { secret, handlers, onError = console.error } = options;

  return async function handle(
    req: {
      method?: string;
      url?: string;
      headers: Record<string, string | string[] | undefined>;
      on(event: "data", fn: (chunk: Buffer) => void): void;
      on(event: "end", fn: () => void): void;
      on(event: "error", fn: (err: Error) => void): void;
    },
    res: {
      writeHead(status: number, headers?: Record<string, string>): void;
      end(body?: string): void;
    },
  ): Promise<void> {
    // Health check
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (req.method !== "POST") {
      res.writeHead(405);
      res.end();
      return;
    }

    // Optional auth
    if (secret) {
      const rawAuth = req.headers["authorization"];
      const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : (rawAuth ?? "");
      const urlObj = new URL(req.url ?? "", "http://localhost");
      const qs = urlObj.searchParams.get("secret") ?? "";
      if (authHeader !== `Bearer ${secret}` && qs !== secret) {
        res.writeHead(401);
        res.end("Unauthorized");
        return;
      }
    }

    // Read body
    let rawBody = "";
    try {
      await new Promise<void>((resolve, reject) => {
        req.on("data", (chunk: Buffer) => {
          rawBody += chunk.toString();
        });
        req.on("end", resolve);
        req.on("error", reject);
      });
    } catch {
      res.writeHead(400);
      res.end("Bad Request");
      return;
    }

    // Parse
    let payload: WebhookPayload;
    try {
      payload = parseWebhook(rawBody);
    } catch {
      res.writeHead(400);
      res.end("Bad Request");
      return;
    }

    // Respond 200 immediately, dispatch async
    res.writeHead(200);
    res.end("OK");

    dispatchWebhook(payload, handlers).catch((err) => onError(err, payload));
  };
}

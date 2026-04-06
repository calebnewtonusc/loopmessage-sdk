/**
 * Usage examples. Not part of the published SDK.
 * Run with: bun run src/example.ts
 */

import {
  LoopMessageClient,
  createWebhookHandler,
  dispatchWebhook,
  isMessageFailed,
  isMessageInbound,
  parseWebhook,
} from "./index.ts";

// ─── 1. Client setup ───────────────────────────────────────────────────────────

const client = new LoopMessageClient({
  apiKey: process.env.LOOP_API_KEY!,
  defaultSender: process.env.LOOP_SENDER_ID,
});

// ─── 2. Send a plain message ───────────────────────────────────────────────────

const { message_id } = await client.messages.send({
  contact: "+13231112233",
  text: "yo",
});

// ─── 3. Check delivery status ──────────────────────────────────────────────────

const { status, error_code } = await client.messages.getStatus(message_id);
if (status === "failed") console.error("Failed, code:", error_code);

// ─── 4. Send with effect + attachment ─────────────────────────────────────────

await client.messages.send({
  contact: "+13231112233",
  text: "check this out",
  effect: "fireworks",
  attachments: ["https://example.com/image.jpg"],
});

// ─── 5. Send a voice message ──────────────────────────────────────────────────

await client.messages.sendVoice({
  contact: "+13231112233",
  media_url: "https://example.com/audio.m4a",
});

// ─── 6. Reply to an inbound message ──────────────────────────────────────────

const inboundMessageId = "uuid-from-webhook";

// Show typing first, then reply
await client.messages.showTyping({ message_id: inboundMessageId, typing: 3 });
await client.messages.send({
  contact: "+13231112233",
  text: "on it",
  reply_to_id: inboundMessageId,
});

// ─── 7. React to a message ────────────────────────────────────────────────────

await client.messages.sendReaction({
  contact: "+13231112233",
  message_id: inboundMessageId,
  reaction: "love",
});

// ─── 8. Send to a group ───────────────────────────────────────────────────────

await client.messages.sendGroup({
  group: "group-guid-from-webhook",
  text: "hey everyone",
});

// ─── 9. Audience management ───────────────────────────────────────────────────

const { items, count } = await client.audience.list({
  per_page: 100,
  search: "+1323",
});
console.log(`${count} contacts found`, items);

const { status: contactStatus } =
  await client.audience.checkStatus("+13231112233");
if (contactStatus === "unsubscribed") console.log("Contact has opted out");

const history = await client.audience.messageHistory("+13231112233", {
  direction: "inbound",
  per_page: 20,
});
console.log(`${history.count} inbound messages`);

// ─── 10. Senders + Pools ──────────────────────────────────────────────────────

const { items: senders } = await client.senders.list();
const activeSender = senders.find((s) => s.status === "active");
console.log("Active sender:", activeSender?.name);

const { items: pools } = await client.pools.list();
console.log(
  "Pools:",
  pools.map((p) => p.name),
);

// ─── 11. Campaign blast ───────────────────────────────────────────────────────

await client.campaigns.create({
  name: "April drop",
  text: "new drop. check it out.",
  contacts: ["+13231112233", "+13232223344"],
  timezone: "America/Los_Angeles",
  from_time: "10:00",
  to_time: "21:00",
});

// Individualized campaign
await client.campaigns.create({
  name: "Personal outreach",
  messages: [
    { contact: "+13231112233", text: "yo alex" },
    { contact: "+13232223344", text: "yo jordan" },
  ],
});

// ─── 12. Opt-in URL generation ────────────────────────────────────────────────

const links = await client.optIn.generateUrl({
  body: "Hey! Text back [opt-in-code] to subscribe.",
  contact: "+13231112233",
  utm_campaign: "spring-2026",
});
console.log("Opt-in URL:", links.url);
console.log("iMessage link:", links.imessage);

// ─── 13. Webhook parsing (manual) ────────────────────────────────────────────

const rawBody =
  '{"event":"message_inbound","message_id":"uuid","contact":"+13231112233","text":"hey","message_type":"text","channel":"imessage","webhook_id":"wh-uuid","api_version":"1.0"}';

const payload = parseWebhook(rawBody);

if (isMessageInbound(payload)) {
  console.log("Inbound from", payload.contact, ":", payload.text);
  if (payload.group) console.log("Group message in group", payload.group.id);
}

if (isMessageFailed(payload)) {
  console.error("Delivery failed, error code:", payload.error_code);
}

// ─── 14. Full webhook dispatch ────────────────────────────────────────────────

await dispatchWebhook(payload, {
  onMessageInbound: async ({ contact, text, message_id }) => {
    await client.messages.showTyping({ message_id, typing: 3 });
    await client.messages.send({ contact, text: `you said: ${text}` });
  },
  onMessageFailed: ({ error_code, contact }) => {
    console.error(`Message to ${contact} failed with code ${error_code}`);
  },
  onOptIn: ({ contact }) => {
    console.log(`${contact} just opted in`);
  },
  onAny: (p) => {
    console.log("event:", p.event, "webhook_id:", p.webhook_id);
  },
});

// ─── 15. Bun webhook server ───────────────────────────────────────────────────

const handler = createWebhookHandler({
  secret: process.env.WEBHOOK_SECRET,
  handlers: {
    onMessageInbound: async ({ contact, text, message_id }) => {
      await client.messages.showTyping({ message_id, typing: 3 });
      await client.messages.send({ contact, text: `got it: ${text}` });
    },
    onMessageFailed: ({ error_code, contact }) => {
      console.error(`Delivery failed for ${contact}, code ${error_code}`);
    },
    onOptIn: ({ contact }) => {
      console.log(`New opt-in: ${contact}`);
    },
    onSenderNameUpdated: ({ sender, status }) => {
      console.log(`Sender ${sender} is now ${status}`);
    },
  },
  onError: (err, p) => {
    console.error("[webhook] handler error", err, p?.event);
  },
});

// Bun.serve({ port: 8080, fetch: handler })
console.log("Handler ready. Uncomment Bun.serve to start");

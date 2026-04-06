# @caleb/loopmessage-sdk

Fully-typed TypeScript SDK for the [Loop Message](https://loopmessage.com) iMessage API.
Zero dependencies. Bun-native. Works on Node.js too.

## Install

```bash
bun add @caleb/loopmessage-sdk
# or
npm install @caleb/loopmessage-sdk
```

## Quick Start

```ts
import { LoopMessageClient } from "@caleb/loopmessage-sdk";

const client = new LoopMessageClient({
  apiKey: process.env.LOOP_API_KEY!,
  defaultSender: process.env.LOOP_SENDER_ID,
});

// Send
const { message_id } = await client.messages.send({
  contact: "+13231112233",
  text: "hey",
});

// Check status
const { status } = await client.messages.getStatus(message_id);
```

## Auth

Your API key goes in the `Authorization` header with **no Bearer prefix** — per Loop Message docs.
Never expose it client-side.

```ts
const client = new LoopMessageClient({ apiKey: process.env.LOOP_API_KEY! });
```

## API Surface

### `client.messages`

| Method                 | Description                                  |
| ---------------------- | -------------------------------------------- |
| `send(params)`         | Send text to a contact (phone or email)      |
| `sendGroup(params)`    | Send text to an iMessage group               |
| `sendVoice(params)`    | Send an audio file (mp3, wav, m4a, caf, aac) |
| `sendReaction(params)` | React to a message (prefix `-` to remove)    |
| `showTyping(params)`   | Show typing indicator and/or mark read       |
| `markRead(params)`     | Mark conversation as read                    |
| `getStatus(messageId)` | Check delivery status                        |

```ts
// Effects
await client.messages.send({ contact, text: "boom", effect: "fireworks" });

// With attachment (max 3 HTTPS image URLs)
await client.messages.send({
  contact,
  text: "check this",
  attachments: ["https://..."],
});

// Reply to a specific message
await client.messages.send({
  contact,
  text: "got it",
  reply_to_id: inbound_message_id,
});

// Show typing then reply
await client.messages.showTyping({ message_id: inbound_id, typing: 3 });
await client.messages.send({ contact, text: "one sec" });

// Reaction / un-reaction
await client.messages.sendReaction({
  contact,
  message_id: "uuid",
  reaction: "love",
});
await client.messages.sendReaction({
  contact,
  message_id: "uuid",
  reaction: "-love",
});

// Voice
await client.messages.sendVoice({
  contact,
  media_url: "https://example.com/audio.m4a",
});

// Status check
const { status, error_code } = await client.messages.getStatus(message_id);
// status: 'processing' | 'delivered' | 'failed' | 'unknown'
```

**Effects:** `slam` `loud` `gentle` `invisibleInk` `echo` `spotlight` `balloons` `confetti` `love` `lasers` `fireworks` `shootingStar` `celebration`

**Channels:** `imessage` `sms` `rcs` `whatsapp` (SMS doesn't support subject, effect, or reply)

### `client.audience`

| Method                             | Description                                 |
| ---------------------------------- | ------------------------------------------- |
| `list(params?)`                    | Paginated list of all contacts              |
| `checkStatus(contact)`             | Check opt-in status for one contact         |
| `unsubscribe(contact)`             | Remove a contact from your audience         |
| `messageHistory(contact, params?)` | Full inbound/outbound history for a contact |

```ts
const { items, count } = await client.audience.list({
  per_page: 100,
  search: "+1323",
});
const { status } = await client.audience.checkStatus("+13231112233");
// status: 'active' | 'unsubscribed' | 'unknown'

await client.audience.unsubscribe("+13231112233");

const history = await client.audience.messageHistory("+13231112233", {
  direction: "inbound",
});
```

### `client.campaigns`

```ts
// Broadcast — same message to all
await client.campaigns.create({
  name: "April drop",
  text: "new drop. check it.",
  contacts: ["+13231112233", "+13232223344"],
  timezone: "America/Los_Angeles",
});

// Individualized — different text per contact
await client.campaigns.create({
  name: "Personal outreach",
  messages: [
    { contact: "+13231112233", text: "yo alex" },
    { contact: "+13232223344", text: "yo jordan" },
  ],
});
```

### `client.senders` and `client.pools`

```ts
const { items: senders } = await client.senders.list();
const active = senders.filter((s) => s.status === "active");

const { items: pools } = await client.pools.list();
```

### `client.optIn`

```ts
const links = await client.optIn.generateUrl({
  body: "Reply [opt-in-code] to subscribe.",
  utm_campaign: "spring-launch",
});
// links.url      — universal HTTPS
// links.imessage — iOS 13+ deep link
// links.sms      — iOS 12 fallback
```

## Webhooks

Loop Message POSTs events to your server. You must respond with HTTP 200 within 15 seconds.

### Bun server (recommended)

```ts
import {
  LoopMessageClient,
  createWebhookHandler,
} from "@caleb/loopmessage-sdk";

const client = new LoopMessageClient({ apiKey: process.env.LOOP_API_KEY! });

const handler = createWebhookHandler({
  secret: process.env.WEBHOOK_SECRET, // optional auth
  handlers: {
    onMessageInbound: async ({ contact, text, message_id }) => {
      await client.messages.showTyping({ message_id, typing: 3 });
      await client.messages.send({ contact, text: `got it: ${text}` });
    },
    onMessageFailed: ({ error_code, contact }) => {
      console.error(`Delivery to ${contact} failed: code ${error_code}`);
    },
    onOptIn: ({ contact }) => {
      console.log(`${contact} opted in`);
    },
    onSenderNameUpdated: ({ sender, status }) => {
      console.log(`Sender ${sender} => ${status}`);
    },
    onAny: (payload) => {
      // Fires after the specific handler for every event
      console.log("event received:", payload.event);
    },
  },
});

Bun.serve({ port: 8080, fetch: handler });
```

### Manual parsing

```ts
import { parseWebhook, dispatchWebhook, isMessageInbound } from '@caleb/loopmessage-sdk'

// Parse raw body string or pre-parsed object
const payload = parseWebhook(rawBodyString)

// Type-safe switch via type guards
if (isMessageInbound(payload)) {
  console.log(payload.contact, payload.text, payload.channel)
  if (payload.group) console.log('group message:', payload.group.id)
}

// Or full dispatch
await dispatchWebhook(payload, { onMessageInbound: async (p) => { ... } })
```

### Webhook event types

| Event                 | When                                     |
| --------------------- | ---------------------------------------- |
| `message_inbound`     | Contact sent you a message               |
| `message_delivered`   | Your message was delivered               |
| `message_failed`      | Your message failed (check `error_code`) |
| `message_reaction`    | Contact reacted to your message          |
| `opt-in`              | Contact completed opt-in                 |
| `inbound_call`        | Contact attempted a FaceTime call        |
| `sender_name_updated` | Your sender name changed status          |
| `unknown`             | Unrecognized event                       |

## Error Handling

All API errors throw `LoopMessageError`:

```ts
import { LoopMessageError } from "@caleb/loopmessage-sdk";

try {
  await client.messages.send({ contact: "+13231112233", text: "hey" });
} catch (err) {
  if (err instanceof LoopMessageError) {
    console.error(err.code); // numeric Loop error code
    console.error(err.httpStatus); // HTTP status
    console.error(err.message); // human-readable description
    console.error(err.isRetryable); // true for 1010, 1020, 1030
    console.error(err.isFatal); // true for auth/billing errors
  }
}
```

The client auto-retries on codes `1010`, `1020`, `1030` (transient send failures) up to 2 times.

## Config Options

```ts
const client = new LoopMessageClient({
  apiKey: "your-key", // required
  defaultSender: "sender-uuid", // optional
  timeout: 15_000, // ms, default 15s
  retries: 2, // retries on transient errors
  retryDelay: 2_000, // base delay between retries (multiplied by attempt)
  baseUrl: "https://a.loopmessage.com", // override for testing
});
```

## Error Code Reference

| Code      | Meaning                               |
| --------- | ------------------------------------- |
| 100       | Bad request                           |
| 110       | Missing credentials                   |
| 130       | Invalid API key                       |
| 160       | Invalid contact                       |
| 240       | Sender not activated                  |
| 340       | Recipient blocked messages            |
| 500       | Contact opted out                     |
| 510       | No recent conversation                |
| 520       | Recipient must initiate first         |
| 580       | Invalid effect                        |
| 1010-1030 | Transient send failure (auto-retried) |

Full table in `src/errors.ts`.

---

All glory to God! ✝️❤️

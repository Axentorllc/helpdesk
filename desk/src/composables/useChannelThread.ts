/**
 * useChannelThread — composable for a pluggable messaging-channel thread add-on.
 *
 * Feature-detected: if get_thread returns available:false (channel plugin absent,
 * feature disabled) or errors (404, network), the composable stays dormant and
 * `available` stays false — the helpdesk UI behaves 100% stock in that state.
 *
 * Generic over `channel` (channel_key from the extensions manifest); the fork's
 * channel dispatch (helpdesk.api.channels) resolves the server-side adapter.
 */

import { createResource } from "frappe-ui";
import { ref } from "vue";

export interface ChannelMessage {
  name: string;
  type: "Incoming" | "Outgoing";
  content_type: string;
  message: string | null;
  attach: string | null;
  status: string | null;
  status_error: string | null;
  creation: string;
  message_id: string | null;
  profile_name: string | null;
}

export interface ChannelConversation {
  name: string;
  source_id: string;
  profile_name: string | null;
  unmatched: boolean;
  status: string;
  window_open: boolean;
  window_expires_at: string | null;
  last_inbound_at: string | null;
  // Contact attributed from a typed (unverified) email/phone, not HMAC-verified.
  identity_unverified?: boolean;
}

export interface ChannelThread {
  available: boolean;
  conversation: ChannelConversation | null;
  messages: ChannelMessage[];
}

// ponytail: module-level map keyed by channel+ticket so the resource is shared per
// (channel, ticket). The channel prefix is load-bearing — without it a second channel
// would clobber the first's thread on the same ticket.
const threadMap: Record<string, ReturnType<typeof _makeThread>> = {};

function _makeThread(channel: string, ticketId: string) {
  const available = ref(false);
  const conversation = ref<ChannelConversation | null>(null);
  const messages = ref<ChannelMessage[]>([]);
  const typing = ref(false);
  let _typingTimer: ReturnType<typeof setTimeout> | null = null;

  function bumpTyping() {
    typing.value = true;
    if (_typingTimer) clearTimeout(_typingTimer);
    _typingTimer = setTimeout(() => { typing.value = false; }, 5000);
  }

  const resource = createResource({
    url: "helpdesk.api.channels.get_thread",
    params: { channel, ticket: ticketId },
    method: "GET",
    auto: true,
    onSuccess(data: ChannelThread) {
      if (!data.available) {
        available.value = false;
        return;
      }
      available.value = true;
      conversation.value = data.conversation ?? null;
      messages.value = data.messages ?? [];
      // A real message beats the typing timer.
      typing.value = false;
      if (_typingTimer) { clearTimeout(_typingTimer); _typingTimer = null; }
    },
    onError() {
      // HTTP 403/404 or plugin not installed — stay dormant, no crash.
      available.value = false;
    },
  });

  return { available, conversation, messages, typing, bumpTyping, resource };
}

export function useChannelThread(channel: string, ticketId: string) {
  const key = `${channel}:${ticketId}`;
  if (!threadMap[key]) {
    threadMap[key] = _makeThread(channel, ticketId);
  }
  return threadMap[key];
}

export function setChannelTyping(channel: string, ticketId: string) {
  threadMap[`${channel}:${ticketId}`]?.bumpTyping();
}

export function reloadChannelThread(channel: string, ticketId: string) {
  const t = threadMap[`${channel}:${ticketId}`];
  if (t) {
    t.typing.value = false;
    t.resource.reload();
  }
}

// Revisit revalidation: refresh every already-fetched thread for this ticket
// (mirrors useTicket's revalidateTicket for the email/comment caches).
export function revalidateChannelThreads(ticketId: string) {
  for (const key of Object.keys(threadMap)) {
    if (key.endsWith(`:${ticketId}`)) threadMap[key].resource.reload();
  }
}

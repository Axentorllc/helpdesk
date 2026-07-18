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
    },
    onError() {
      // HTTP 403/404 or plugin not installed — stay dormant, no crash.
      available.value = false;
    },
  });

  return { available, conversation, messages, resource };
}

export function useChannelThread(channel: string, ticketId: string) {
  const key = `${channel}:${ticketId}`;
  if (!threadMap[key]) {
    threadMap[key] = _makeThread(channel, ticketId);
  }
  return threadMap[key];
}

export function reloadChannelThread(channel: string, ticketId: string) {
  threadMap[`${channel}:${ticketId}`]?.resource.reload();
}

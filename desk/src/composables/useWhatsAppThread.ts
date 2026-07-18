/**
 * useWhatsAppThread — composable for the WhatsApp thread add-on.
 *
 * Feature-detected: if get_thread returns available:false (frappe_whatsapp absent,
 * feature disabled) or errors (404, network), the composable stays dormant and
 * `available` stays false — the helpdesk UI behaves 100% stock in that state.
 */

import { createResource } from "frappe-ui";
import { computed, ref } from "vue";

export interface WaMessage {
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

export interface WaConversation {
  name: string;
  wa_id: string;
  profile_name: string | null;
  unmatched: boolean;
  status: string;
  window_open: boolean;
  window_expires_at: string | null;
  last_inbound_at: string | null;
}

export interface WaThread {
  available: boolean;
  conversation: WaConversation | null;
  messages: WaMessage[];
}

// ponytail: module-level map so the resource is shared per ticket (same pattern as useTicket.ts)
const threadMap: Record<string, ReturnType<typeof _makeThread>> = {};

function _makeThread(ticketId: string) {
  const available = ref(false);
  const conversation = ref<WaConversation | null>(null);
  const messages = ref<WaMessage[]>([]);

  const resource = createResource({
    url: "axe_helpdesk_wa.api.get_thread",
    params: { ticket: ticketId },
    method: "GET",
    auto: true,
    onSuccess(data: WaThread) {
      if (!data.available) {
        available.value = false;
        return;
      }
      available.value = true;
      conversation.value = data.conversation ?? null;
      messages.value = data.messages ?? [];
    },
    onError() {
      // HTTP 403/404 or app not installed — stay dormant, no crash.
      available.value = false;
    },
  });

  return { available, conversation, messages, resource };
}

export function useWhatsAppThread(ticketId: string) {
  if (!threadMap[ticketId]) {
    threadMap[ticketId] = _makeThread(ticketId);
  }
  return threadMap[ticketId];
}

export function reloadWhatsAppThread(ticketId: string) {
  threadMap[ticketId]?.resource.reload();
}

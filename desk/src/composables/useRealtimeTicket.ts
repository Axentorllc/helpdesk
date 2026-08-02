import { useSocketEvent } from "@/composables/useSocketEvent";
import {
  reloadChannelThread,
  setChannelTyping,
  useChannelThread,
} from "@/composables/useChannelThread";
import { useAuthStore } from "@/stores/auth";
import { globalStore } from "@/stores/globalStore";
import { onScopeDispose, ref, watch, type Ref } from "vue";

type FieldNudge = {
  ticket_id: string;
  user: string;
  field: string;
  value: string;
};

type ChannelEvent = {
  channel: string;
  event: string;
  ticket: string | null;
  conversation: string | null;
};

interface RealtimeTicketCallbacks {
  // Re-emitted view_ticket already re-joins the room; this revalidates whatever the
  // page might have missed while disconnected.
  onReconnect?: () => void;
  // helpdesk:ticket-update — a ticket field changed server-side.
  onTicketUpdate?: () => void;
  // helpdesk:ticket-comment — a new comment/activity landed.
  onTicketComment?: () => void;
  // ticket_update — another agent nudged a field (toast payload).
  onFieldNudge?: (data: FieldNudge) => void;
  // Wire hd_channel_event (plugged-in channel message/status/typing).
  channelEvents?: boolean;
  // Track ticket_viewers and expose the list; omit for pages with no viewers UI.
  viewers?: boolean;
}

// Owns every per-ticket socket concern for a page: room membership, reconnect
// re-join, and the ticket-scoped listeners. All listeners filter on the *current*
// ticketId ref so a fast ticket switch never fires stale callbacks.
export function useRealtimeTicket(
  ticketId: Ref<string>,
  callbacks: RealtimeTicketCallbacks = {}
) {
  const { $socket } = globalStore();
  const { userId } = useAuthStore();

  const viewers = ref<string[]>([]);

  // One stable beforeunload handler so add/remove pair up across ticket switches
  // (ported from realtime.ts — a fresh arrow per join would leak a listener).
  let joinedId: string | null = null;
  const handleBeforeUnload = () => {
    if (joinedId) $socket.emit("stop_view_ticket", joinedId);
  };

  const joinRoom = (id: string) => {
    $socket.emit("view_ticket", id);
    joinedId = id;
    window.removeEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("beforeunload", handleBeforeUnload);
  };
  const leaveRoom = (id: string) => {
    $socket.emit("stop_view_ticket", id);
  };

  // Join on mount and on every ticket switch, leaving the previous room first.
  watch(
    ticketId,
    (id, oldId) => {
      if (oldId && oldId !== id) leaveRoom(oldId);
      viewers.value = [];
      joinRoom(id);
    },
    { immediate: true }
  );

  onScopeDispose(() => {
    if (joinedId) leaveRoom(joinedId);
    window.removeEventListener("beforeunload", handleBeforeUnload);
  });

  // socket.io rooms are server-side state lost on every reconnect; re-join and let
  // the page revalidate what it missed.
  useSocketEvent("connect", () => {
    joinRoom(ticketId.value);
    callbacks.onReconnect?.();
  });

  if (callbacks.onTicketUpdate) {
    useSocketEvent("helpdesk:ticket-update", (data: { ticket_id: string }) => {
      if (data.ticket_id === ticketId.value) callbacks.onTicketUpdate!();
    });
  }

  if (callbacks.onTicketComment) {
    useSocketEvent("helpdesk:ticket-comment", (data: { ticket_id: string }) => {
      if (data.ticket_id === ticketId.value) callbacks.onTicketComment!();
    });
  }

  if (callbacks.onFieldNudge) {
    useSocketEvent("ticket_update", (data: FieldNudge) => {
      if (data.ticket_id === ticketId.value) callbacks.onFieldNudge!(data);
    });
  }

  if (callbacks.viewers) {
    useSocketEvent(
      "ticket_viewers",
      (data: { ticket_id: string; users: string }) => {
        if (data.ticket_id !== ticketId.value) return;
        viewers.value = JSON.parse(data.users).filter(
          (u: string) => u !== userId
        );
      }
    );
  }

  if (callbacks.channelEvents) {
    // Channel realtime: one generic event for any plugged-in channel. Carries ticket
    // context, so we target this ticket precisely instead of a blanket reload.
    useSocketEvent("hd_channel_event", (data: ChannelEvent) => {
      const id = ticketId.value;
      const thread = useChannelThread(data.channel, id);
      if (
        data.ticket === id ||
        (data.conversation &&
          thread.conversation.value?.name === data.conversation)
      ) {
        if (data.event === "typing") {
          setChannelTyping(data.channel, id);
          return;
        }
        reloadChannelThread(data.channel, id);
      }
    });
  }

  return { viewers };
}

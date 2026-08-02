import { useSocketEvent } from "@/composables/useSocketEvent";
import { useAuthStore } from "@/stores/auth";
import { globalStore } from "@/stores/globalStore";
import { reactive, ref, watch } from "vue";

export function useNotifyTicketUpdate(ticketId: string) {
  const { $socket } = globalStore();
  const notifyTicketUpdate = (field: string, value: string) => {
    $socket.emit("notify_ticket_update", ticketId, field, value);
  };
  // how to check if $socket is already listening to avoid multiple listeners
  return { notifyTicketUpdate };
}

export function useTyping(ticketId: string) {
  const { $socket } = globalStore();
  const { userId } = useAuthStore();

  const typingCounter = ref(0);
  const isTyping = ref(false);
  const typingUsers = reactive<string[]>([]);
  let timeout: any = null;

  // Listen for typing events from other users. Named handlers via useSocketEvent so
  // one editor unmounting no longer clobbers the others' typing listeners.
  useSocketEvent(
    "helpdesk_ticket_typing",
    (data: { ticket_id: string; user: string }) => {
      if (data.ticket_id === ticketId && data.user !== userId) {
        // Add user to typing list if not already present
        if (!typingUsers.includes(data.user)) {
          typingUsers.push(data.user);
        }
      }
    }
  );

  // Listen for typing stopped events
  useSocketEvent(
    "helpdesk_ticket_typing_stopped",
    (data: { ticket_id: string; user: string }) => {
      if (data.ticket_id === ticketId) {
        // Remove user from typing list
        const index = typingUsers.indexOf(data.user);
        if (index > -1) {
          typingUsers.splice(index, 1);
        }
      }
    }
  );

  const emitStartTyping = () => {
    $socket?.emit("helpdesk_ticket_typing", ticketId);
  };

  const emitStopTyping = () => {
    $socket?.emit("helpdesk_ticket_typing_stopped", ticketId);
  };

  const onUserType = () => {
    if (!isTyping.value) {
      isTyping.value = true;
      typingCounter.value = typingCounter.value + 1;
      emitStartTyping();
    }
  };

  // Reset the typing state after 10 seconds of inactivity
  // If agent is not typing for 10 seconds, we assume they have stopped typing
  watch(typingCounter, (newVal) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    if (newVal > 0) {
      timeout = setTimeout(() => {
        isTyping.value = false;
        typingCounter.value = 0;
        emitStopTyping();
      }, 10000);
    }
  });

  const stopTyping = () => {
    emitStopTyping();
    isTyping.value = false;
    typingCounter.value = 0;
    if (timeout) {
      clearTimeout(timeout);
    }
  };

  const cleanup = () => {
    stopTyping();
    if (timeout) {
      clearTimeout(timeout);
    }
    // Socket listeners are removed by useSocketEvent's onScopeDispose.
  };

  return {
    stopTyping,
    onUserType,
    typingUsers,
    cleanup,
  };
}

<template>
  <div v-if="ticket.doc?.name" class="flex-1">
    <TicketHeader :viewers="viewers" />
    <div class="h-full flex overflow-hidden">
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Tabs & Communication Area -->
        <TicketActivityPanel />
      </div>

      <!-- Sidepanel with Resizer -->
      <TicketSidebar />
    </div>
    <SetContactPhoneModal
      v-if="ticket.doc.contact"
      v-model="showPhoneModal"
      :name="ticket.doc?.contact"
      @onUpdate="ticket.reload"
    />
  </div>
  <div
    v-else-if="!ticket.doc && !ticket.get?.error"
    class="grid h-full place-items-center"
  >
    <LoadingIndicator class="w-6 text-ink-gray-4" />
  </div>

  <div v-else class="grid h-full place-items-center px-4 py-20 text-center">
    <div class="space-y-2">
      <div class="flex justify-center items-center mx-auto">
        <TicketIcon class="size-10 text-ink-gray-4" />
      </div>
      <div class="text-lg-medium text-ink-gray-8">
        {{ __("Ticket not found") }}
      </div>
      <div class="text-center text-p-base text-ink-gray-6 mt-1">
        {{
          __("You don't have access to this ticket, or it no longer exists.")
        }}
      </div>
      <Button :route="{ name: 'TicketsAgent' }" variant="subtle">
        <template #prefix
          ><FeatherIcon name="arrow-left" class="size-4"
        /></template>
        {{ __("Back to Tickets") }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import TicketIcon from "@/components/icons/TicketIcon.vue";
import TicketActivityPanel from "@/components/ticket-agent/TicketActivityPanel.vue";
import TicketHeader from "@/components/ticket-agent/TicketHeader.vue";
import TicketSidebar from "@/components/ticket-agent/TicketSidebar.vue";
import SetContactPhoneModal from "@/components/ticket/SetContactPhoneModal.vue";
import { useRealtimeTicket } from "@/composables/useRealtimeTicket";
import {
  reloadTicket,
  revalidateTicket,
  useTicket,
} from "@/composables/useTicket";
import { revalidateChannelThreads } from "@/composables/useChannelThread";
import { ticketsToNavigate } from "@/composables/useTicketNavigation";
import { useTelephonyStore } from "@/stores/telephony";
import {
  ActivitiesSymbol,
  AssigneeSymbol,
  Customizations,
  CustomizationSymbol,
  RecentSimilarTicketsSymbol,
  Resource,
  TicketContactSymbol,
  TicketSymbol,
} from "@/types";
import {
  createResource,
  LoadingIndicator,
  toast,
  usePageMeta,
} from "frappe-ui";
import { computed, onBeforeUnmount, provide, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { showCommentBox, showEmailBox } from "./modalStates";

const telephonyStore = useTelephonyStore();

const props = defineProps({
  ticketId: {
    type: String,
    required: true,
  },
});
const route = useRoute();
const showPhoneModal = ref(false);

const ticketComposable = computed(() => useTicket(props.ticketId));
const ticket = computed(() => ticketComposable.value.ticket);
const customizations: Resource<Customizations> = createResource({
  url: "helpdesk.helpdesk.doctype.hd_ticket.api.get_ticket_customizations",
  cache: ["HD Ticket", "customizations"],
  auto: true,
});

provide(TicketSymbol, ticket);

provide(
  AssigneeSymbol,
  computed(() => ticketComposable.value.assignees)
);
provide(
  TicketContactSymbol,
  computed(() => ticketComposable.value.contact)
);
provide(
  CustomizationSymbol,
  computed(() => customizations)
);
provide(
  RecentSimilarTicketsSymbol,
  computed(() => ticketComposable.value.recentSimilarTickets)
);
provide(
  ActivitiesSymbol,
  computed(() => ticketComposable.value.activities)
);
provide("makeCall", () => {
  if (
    !ticketComposable.value.contact.data?.mobile_no &&
    !ticketComposable.value.contact.data?.phone
  ) {
    showPhoneModal.value = true;
    return;
  }
  telephonyStore.makeCall({
    number:
      ticketComposable.value.contact.data?.phone ||
      ticketComposable.value.contact.data?.mobile_no,
    doctype: "HD Ticket",
    docname: props.ticketId,
  });
});
provide("refreshTicket", () => reloadTicket(props.ticketId));
provide("onCallEnded", () => reloadTicket(props.ticketId));

const ticketIdRef = computed(() => props.ticketId);

const revalidateAll = () => {
  revalidateTicket(props.ticketId);
  revalidateChannelThreads(props.ticketId);
};

const { viewers } = useRealtimeTicket(ticketIdRef, {
  onReconnect: revalidateAll,
  onTicketUpdate: () => reloadTicket(props.ticketId),
  onTicketComment: () => ticketComposable.value.activities.reload(),
  onFieldNudge: (data) =>
    toast.info(`User ${data.user} updated ${data.field} to ${data.value}`),
  channelEvents: true,
  viewers: true,
});

// Runs on mount AND on every ticketId change (the detail component is reused across
// tickets under the nested route, so this can't live in onMounted). Revisiting a
// ticket shows its cached conversation immediately and refreshes it in place, since
// a reply may have arrived while the socket listener was off.
watch(
  () => props.ticketId,
  () => {
    revalidateAll();
    ticketsToNavigate.update({
      params: {
        ticket: props.ticketId,
        current_view: route.query.view as string,
      },
    });
    ticketsToNavigate.reload();
    ticket.value.markSeen.reload();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  showEmailBox.value = false;
  showCommentBox.value = false;
});
usePageMeta(() => {
  if (!ticket.value?.doc?.name) {
    return { title: props.ticketId };
  }

  return {
    title: props.ticketId + " - " + (ticket.value?.doc?.subject ?? ""),
  };
});
</script>

<style>
.breadcrumbs button {
  background-color: inherit !important;
  &:hover,
  &:focus {
    background-color: inherit !important;
  }
}
</style>

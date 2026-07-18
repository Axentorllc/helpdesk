<template>
  <Tabs
    :modelValue="tabIndex"
    :tabs="tabs"
    @update:modelValue="changeTabTo"
    class="[&_[role='tab']]:px-0 [&_[role='tablist']]:px-5 [&_[role='tablist']]:gap-7.5 [&_[role='tablist']]:flex-shrink-0 [&_[role='tabpanel'][data-state='active']]:flex-1"
  >
    <template #tab-panel="{ tab }">
      <TicketAgentActivities
        v-if="Boolean(activities.data)"
        ref="ticketAgentActivitiesRef"
        :activities="filterActivities(tab.name as TicketTab)"
        :title="tab.label"
        :ticket-status="ticket.doc.status"
        @email:reply="
          (e) => {
            communicationAreaRef?.replyToEmail(e);
          }
        "
        @update="
          () => {
            activities.reload();
            ticketAgentActivitiesRef?.scrollToLatestActivity();
          }
        "
      />
      <!-- <div v-else class="flex items-center justify-center flex-col flex-1">
        <Button :loading="true" variant="ghost" size="2xl" />
        <p class="text-xl font-medium text-ink-gray-5">Loading...</p>
      </div> -->
    </template>
  </Tabs>
  <!-- Comm Area -->
  <CommunicationArea
    ref="communicationAreaRef"
    :ticketId="String(ticket.doc?.name)"
    :to-emails="[ticket.doc?.raised_by]"
    :cc-emails="[]"
    :bcc-emails="[]"
    :key="ticket.doc?.name"
    :wa-thread="waThread"
    @update="
      () => {
        activities.reload();
        ticketAgentActivitiesRef?.scrollToLatestActivity();
      }
    "
    @wa-sent="
      () => {
        waThread.resource.reload();
        activities.reload();
        ticketAgentActivitiesRef?.scrollToLatestActivity();
      }
    "
  />
</template>

<script setup lang="ts">
import CommunicationArea from "@/components/CommunicationArea.vue";
import {
  ActivityIcon,
  CommentIcon,
  EmailIcon,
  PhoneIcon,
} from "@/components/icons";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon.vue";
import { useActiveTabManager } from "@/composables/useActiveTabManager";
import { useWhatsAppThread } from "@/composables/useWhatsAppThread";
import { useTelephonyStore } from "@/stores/telephony";
import {
  ActivitiesSymbol,
  FeedbackActivity,
  TabObject,
  TicketSymbol,
  TicketTab,
} from "@/types";
import { Button, Tabs } from "frappe-ui";
import { storeToRefs } from "pinia";
import { computed, ComputedRef, inject, ref } from "vue";
import { TicketAgentActivities } from "../ticket";

const ticket = inject(TicketSymbol);
const activities = inject(ActivitiesSymbol);

const ticketAgentActivitiesRef = ref<InstanceType<
  typeof TicketAgentActivities
> | null>(null);
const communicationAreaRef = ref<InstanceType<typeof CommunicationArea> | null>(
  null
);
const telephonyStore = useTelephonyStore();
const { isCallingEnabled } = storeToRefs(telephonyStore);

// WhatsApp thread — feature-detected; available=false = no UI changes.
// Direct call (not computed): TicketActivityPanel only mounts when ticket.doc.name
// is set (parent v-if guard in TicketAgent.vue), so the ID is stable at setup time.
// The thread resource's internal refs drive reactivity; no computed wrapper needed.
const waThread = useWhatsAppThread(String(ticket.value?.doc?.name || ""));

const tabs: ComputedRef<TabObject[]> = computed(() => {
  const _tabs: TabObject[] = [
    {
      name: "activity",
      label: "Activity",
      icon: ActivityIcon,
    },
    {
      name: "email",
      label: "Emails",
      icon: EmailIcon,
    },
    {
      name: "comment",
      label: "Comments",
      icon: CommentIcon,
    },
  ];

  if (isCallingEnabled.value) {
    _tabs.push({
      name: "call",
      label: "Calls",
      icon: PhoneIcon,
    });
  }
  // WhatsApp tab: only when available AND a conversation exists for this ticket.
  // available=true + conversation=null means glue app installed but no WA thread on this ticket.
  if (waThread.available.value && waThread.conversation.value !== null) {
    _tabs.push({
      name: "whatsapp" as TicketTab,
      label: "WhatsApp",
      icon: WhatsAppIcon,
    });
  }
  return _tabs;
});

const { tabIndex, changeTabTo } = useActiveTabManager(tabs);

// TODO: refactor for pagination
// can be done once we sort out the backend
// sender mail will be  user using portal
const _activities = computed(() => {
  if (!activities.value?.data) {
    return [];
  }
  const emailProps = activities.value?.data?.communications
    .filter((email: any) => email.communication_medium !== "Chat")
    .filter((email: any, idx: number) => {
      // Skip description-dup: first email whose stripped content matches first inbound WA message.
      if (idx !== 0) return true;
      if (!waThread.conversation.value) return true;
      const firstInbound = (waThread.messages.value ?? []).find(
        (m: any) => m.type === "Incoming"
      );
      if (!firstInbound?.message) return true;
      const emailText = (email.content || "").replace(/<[^>]+>/g, "").trim();
      return emailText !== firstInbound.message.trim();
    })
    .map(
    (email: any, idx: number) => {
      return {
        subject: email.subject,
        content: email.content,
        sender: {
          name: email.user.email,
          full_name: email.user.name,
        },
        to: email.recipients,
        type: "email",
        key: email.creation,
        cc: email.cc,
        bcc: email.bcc,
        creation: email.communication_date || email.creation,
        attachments: email.attachments,
        name: email.name,
        deliveryStatus: email.delivery_status,
        isFirstEmail: idx === 0,
      };
    }
  );

  const commentProps = activities.value.data.comments.map((comment: any) => {
    return {
      name: comment.name,
      type: "comment",
      key: comment.creation,
      commentedBy: comment.commented_by,
      commenter: comment.user.name,
      creation: comment.creation,
      content: comment.content,
      attachments: comment.attachments,
    };
  });

  activities.value.data.history.map((h: any) => {
    // }
    h.action;
    h.owner;
    // if h.actions includes h.owner, replace it with 'themselves'
    if (h.action && h.owner && h.action.includes(h.owner)) {
      h.action = h.action.replace(h.owner, "themselves");
    }
    return h;
  });

  const historyProps = [
    ...activities.value.data.history,
    ...activities.value.data.views,
  ].map((h: any) => {
    return {
      type: "history",
      key: h.creation,
      content: h.action ? h.action : "viewed this",
      creation: h.creation,
      user: h.user.name + " ",
    };
  });

  const callProps = activities.value.data.calls.map((call: any) => {
    return {
      ...call,
      type: "call",
      name: call.name,
      key: call.creation,
      call_type: call.type,
      content: `${call.caller || "Unknown"} made a call to ${
        call.receiver || "Unknown"
      }`,
      duration: call.duration ? call.duration + "s" : "0s",
    };
  });

  // WhatsApp messages merged into the unified feed — only when a conversation exists.
  const waProps = (waThread.conversation.value !== null ? waThread.messages.value ?? [] : []).map((m) => ({
    type: "whatsapp",
    key: `wa-${m.name}`,
    creation: m.creation,
    content: m.message || "",  // string content so history-grouping loop stays safe
    // WhatsApp-specific fields passed through to WhatsAppArea.
    waMessage: m,
  }));

  const sorted = [
    ...emailProps,
    ...commentProps,
    ...historyProps,
    ...callProps,
    ...waProps,
  ].sort((a, b) => new Date(a.creation).getTime() - new Date(b.creation).getTime());
  const data: any[] = [];
  let i = 0;

  while (i < sorted.length) {
    const currentActivity = sorted[i];

    if (currentActivity.type === "history") {
      currentActivity.relatedActivities = [currentActivity];
      for (let j = i + 1; j < sorted.length + 1; j++) {
        const nextActivity = sorted[j];

        if (
          nextActivity &&
          nextActivity.user === currentActivity.user &&
          nextActivity.content !== "viewed this" &&
          !nextActivity.content.includes("assigned") &&
          !nextActivity.content.includes("unassigned")
        ) {
          currentActivity.relatedActivities.push(nextActivity);
        } else {
          data.push(currentActivity);
          i = j - 1;
          break;
        }
      }
    } else {
      data.push(currentActivity);
    }
    i++;
  }
  // add feedback data at the last always
  // name is email
  // full_name is name

  if (ticket.value.doc.feedback_rating === 0) {
    return data;
  }
  let feedbackActivity: FeedbackActivity[] = [
    {
      type: "feedback",
      key: "feedback-activity",
      feedback_rating: ticket.value?.doc.feedback_rating,
      feedback_extra: ticket.value?.doc.feedback_extra,
      feedback: ticket.value?.doc.feedback,
      sender: {
        name: ticket.value?.doc.raised_by,
        full_name: ticket.value?.doc.contact,
      },
    },
  ];
  data.push(...feedbackActivity);

  return data;
});

function filterActivities(eventType: TicketTab | string) {
  if (eventType === "activity") {
    return _activities.value;
  }
  if (eventType === "whatsapp") {
    return _activities.value.filter((a: any) => a.type === "whatsapp");
  }
  return _activities.value.filter((activity: any) => activity.type === eventType);
}
</script>

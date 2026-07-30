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
        :activities="filterActivities(tab.name)"
        :title="tab.label"
        :ticket-status="ticket.doc.status"
        :typing-label="typingLabelFor(tab.name)"
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
        <p class="text-2xl-medium text-ink-gray-5">Loading...</p>
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
    :channel-threads="channelThreads"
    @update="
      () => {
        activities.reload();
        ticketAgentActivitiesRef?.scrollToLatestActivity();
      }
    "
    @channel-sent="
      (channel) => {
        reloadChannelThread(channel, ticketId);
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
import { useActiveTabManager } from "@/composables/useActiveTabManager";
import { useChannelThread, reloadChannelThread } from "@/composables/useChannelThread";
import { useChannelsStore, channelIcon } from "@/stores/channels";
import { useTelephonyStore } from "@/stores/telephony";
import {
  ActivitiesSymbol,
  FeedbackActivity,
  TabObject,
  TicketSymbol,
  TicketTab,
} from "@/types";
import { Tabs } from "frappe-ui";
import { storeToRefs } from "pinia";
import { computed, ComputedRef, inject, ref, watch } from "vue";
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

const channelsStore = useChannelsStore();
const { channels } = storeToRefs(channelsStore);

// Channel threads — one feature-detected thread per manifest channel. The panel only
// mounts when ticket.doc.name is set (parent v-if in TicketAgent.vue), so the id is
// stable at setup. useChannelThread is memoized per (channel, ticket); the threads'
// internal refs drive reactivity.
// Reactive: the SPA reuses this component instance across ticket switches (no :key on
// <TicketActivityPanel> and useTicket is memoized), so a plain-string capture would
// stay pointed at the previous ticket and cross-wire the thread/composer to the wrong
// conversation. Computed → channelThreads re-keys the memoized threads on switch.
const ticketId = computed(() => String(ticket.value?.doc?.name || ""));
const channelThreads = computed(() =>
  channels.value.map((ch) => ({
    ...ch,
    thread: useChannelThread(ch.channel_key, ticketId.value),
  }))
);

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
  // One tab per channel that is available AND has a conversation on this ticket.
  // available=true + conversation=null means the plugin is installed but there is no
  // thread on this ticket. Tab name = channel_key (preserves saved-tab prefs).
  channelThreads.value.forEach((ch) => {
    if (ch.thread.available.value && ch.thread.conversation.value !== null) {
      _tabs.push({
        name: ch.channel_key,
        label: ch.label,
        icon: channelIcon(ch.icon),
      });
    }
  });
  return _tabs;
});

const { tabIndex, changeTabTo } = useActiveTabManager(tabs);

// First inbound message across any channel thread — used to dedup the ticket
// description email against the opening channel message.
const firstChannelInbound = computed(() =>
  channelThreads.value
    .flatMap((ch) =>
      ch.thread.conversation.value !== null ? ch.thread.messages.value ?? [] : []
    )
    .find((m: any) => m.type === "Incoming")
);

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
      // Skip description-dup: first email whose stripped content matches first inbound channel message.
      if (idx !== 0) return true;
      const firstInbound = firstChannelInbound.value;
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

  // Channel messages merged into the unified feed — one flat list across all channels,
  // only for channels that have a conversation on this ticket.
  const channelProps = channelThreads.value.flatMap((ch) =>
    (ch.thread.conversation.value !== null ? ch.thread.messages.value ?? [] : []).map(
      (m: any) => ({
        type: "channel",
        channel: ch.channel_key,
        key: `${ch.channel_key}-${m.name}`,
        creation: m.creation,
        content: m.message || "", // string content so history-grouping loop stays safe
        channelMessage: m,
        capabilities: ch.capabilities,
      })
    )
  );

  const sorted = [
    ...emailProps,
    ...commentProps,
    ...historyProps,
    ...callProps,
    ...channelProps,
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

function typingLabelFor(tabName: string): string {
  // Unified activity tab shows any typing channel; a channel tab only its own.
  const ch = channelThreads.value.find(
    (c) =>
      (tabName === "activity" || c.channel_key === tabName) &&
      c.capabilities?.typing &&
      c.thread.typing?.value &&
      c.thread.conversation.value
  );
  if (!ch) return "";
  const name = ch.thread.conversation.value.profile_name || "Customer";
  return `${name} is typing`;
}

// Socket reload updates the feed reactively but never scrolls; this watch does.
const channelMessageCount = computed(() =>
  channelThreads.value.reduce((n, ch) => n + (ch.thread.messages.value?.length ?? 0), 0)
);
watch(channelMessageCount, (n, old) => {
  if (n > old) ticketAgentActivitiesRef.value?.scrollToLatestActivity();
});

function filterActivities(eventType: TicketTab | string) {
  if (eventType === "activity") {
    return _activities.value;
  }
  // Channel tabs: tab name === channel_key.
  if (channels.value.some((c) => c.channel_key === eventType)) {
    return _activities.value.filter(
      (a: any) => a.type === "channel" && a.channel === eventType
    );
  }
  return _activities.value.filter((activity: any) => activity.type === eventType);
}
</script>

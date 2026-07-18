<template>
  <!-- Card anatomy mirrors EmailArea: border border-outline-gray-2 rounded-md -->
  <div class="grow bg-surface-white rounded-md border border-outline-gray-2 text-base leading-6">
    <!-- Header row: sender + timestamp -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1">
        <span class="font-medium" dir="auto">
          {{ senderLabel }}
        </span>
        <span class="text-sm text-ink-gray-5" v-if="activity.type === 'Outgoing'">
          {{ __("(agent)") }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <!-- Delivery status badge for outgoing messages (delivery_status capability) -->
        <Badge
          v-if="capabilities.delivery_status && activity.type === 'Outgoing' && statusBadge.label"
          :label="statusBadge.label"
          variant="subtle"
          :theme="statusBadge.color"
        />
        <Tooltip :text="dateFormat(activity.creation, dateTooltipFormat)">
          <p class="text-xs md:text-sm text-ink-gray-5">
            {{ timeAgo(activity.creation) }}
          </p>
        </Tooltip>
      </div>
    </div>

    <div class="border-0 border-t my-3 border-outline-gray-modals !-mx-3" />

    <!-- Message body -->
    <!-- text: dir=auto for RTL Arabic support -->
    <div v-if="isText" dir="auto" class="text-p-base text-ink-gray-8 whitespace-pre-wrap break-words">
      {{ activity.message }}
    </div>

    <!-- Image/sticker: inline thumbnail -->
    <div v-else-if="isMedia && activity.attach">
      <a :href="activity.attach" target="_blank" rel="noopener">
        <img
          :src="activity.attach"
          class="max-h-48 max-w-full rounded object-contain border border-outline-gray-2"
          :alt="activity.content_type"
        />
      </a>
    </div>

    <!-- Unsupported/location/contacts: italic placeholder -->
    <div v-else class="text-p-sm text-ink-gray-5 italic">
      {{ activity.message || __("[Unsupported message type]") }}
    </div>

    <!-- Failed send error detail -->
    <div
      v-if="activity.status === 'failed' && activity.status_error"
      class="mt-2 text-p-sm text-ink-red-3"
    >
      {{ activity.status_error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { dateFormat, dateTooltipFormat, timeAgo } from "@/utils";
import { Badge, Tooltip } from "frappe-ui";
import { computed } from "vue";

const props = defineProps({
  activity: {
    type: Object,
    required: true,
  },
  // Channel capability flags from the extensions manifest; gate channel-specific UI
  // (delivery_status badges here). Default to permissive so a bare mount still renders.
  capabilities: {
    type: Object,
    default: () => ({}),
  },
});

const senderLabel = computed(() => {
  if (props.activity.type === "Incoming") {
    return props.activity.profile_name || props.activity.source_id || __("Customer");
  }
  return props.activity.sender?.full_name || __("Agent");
});

const isText = computed(() =>
  !props.activity.content_type || props.activity.content_type === "text"
);

const isMedia = computed(() =>
  ["image", "sticker", "video", "audio", "document"].includes(
    props.activity.content_type
  )
);

// Mirror EmailArea status badge logic (same color tokens).
const statusBadge = computed(() => {
  const status = props.activity.status || "";
  if (status === "failed") return { label: __("Failed"), color: "red" };
  if (status === "read") return { label: __("Read"), color: "blue" };
  if (status === "delivered") return { label: __("Delivered"), color: "green" };
  if (status === "sent") return { label: __("Sent"), color: "green" };
  return { label: "", color: "gray" };
});
</script>

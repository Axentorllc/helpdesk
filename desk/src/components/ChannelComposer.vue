<template>
  <!-- Generic channel reply composer. Shown only when the channel thread is available. -->
  <div class="overflow-hidden">
    <div class="px-5 py-3 border-t border-outline-gray-modals">
      <!-- Window state chip (session_window capability only) -->
      <div v-if="capabilities.session_window" class="mb-3 flex items-center gap-2">
        <Badge
          v-if="windowOpen"
          :label="windowCountdown"
          variant="subtle"
          theme="green"
        />
        <Badge
          v-else
          :label="__('Window closed — template required')"
          variant="subtle"
          theme="orange"
        />
      </div>

      <!-- Free-text area (window open, or channel has no session window) -->
      <div v-if="windowOpen" class="flex flex-col gap-2">
        <textarea
          v-model="messageText"
          :placeholder="composerPlaceholder"
          class="w-full resize-none rounded-md border border-outline-gray-2 bg-surface-white px-3 py-2 text-p-base text-ink-gray-8 placeholder:text-ink-gray-4 focus:border-outline-gray-4 focus:outline-none min-h-[80px]"
          dir="auto"
        />
        <div class="flex justify-end gap-2">
          <Button
            label="Discard"
            @click="emit('discard')"
          />
          <Button
            variant="solid"
            :label="sending ? __('Sending…') : sendLabel"
            :loading="sending"
            :disabled="!messageText.trim() || sending"
            @click="sendMessage"
          />
        </div>
      </div>

      <!-- Template picker (window closed + templates capability) -->
      <div v-else-if="capabilities.templates" class="flex flex-col gap-2">
        <div class="text-p-sm text-ink-gray-5 mb-1">
          {{ __("Select a pre-approved template to re-engage the customer.") }}
        </div>
        <Autocomplete
          :options="templateOptions"
          v-model="selectedTemplate"
          :placeholder="__('Search templates…')"
          class="w-full"
        />
        <div v-if="selectedTemplate" class="rounded border border-outline-gray-2 bg-surface-gray-1 px-3 py-2 text-p-sm text-ink-gray-7 mt-1" dir="auto">
          {{ templatePreview }}
        </div>
        <div class="flex justify-end gap-2">
          <Button
            label="Discard"
            @click="emit('discard')"
          />
          <Button
            variant="solid"
            :label="sending ? __('Sending…') : __('Send Template')"
            :loading="sending"
            :disabled="!selectedTemplate || sending"
            @click="sendTemplate"
          />
        </div>
      </div>

      <!-- Window closed and channel has no template fallback -->
      <div v-else class="flex items-center justify-between gap-2">
        <div class="text-p-sm text-ink-gray-5">
          {{ __("This conversation is outside the reply window.") }}
        </div>
        <Button label="Discard" @click="emit('discard')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { __ } from "@/translation";
import { Autocomplete } from "@/components";
import { Badge, Button, createResource, dayjsLocal, toast } from "frappe-ui";
import { computed, onUnmounted, ref } from "vue";
import type { ChannelConversation } from "@/composables/useChannelThread";

const props = defineProps<{
  conversation: ChannelConversation;
  ticketId: string;
  channel: string;
  label: string;
  capabilities: Record<string, boolean>;
}>();

const emit = defineEmits(["discard", "sent"]);

// When the channel has no session window (capability off), replies are always allowed.
const windowOpen = computed(() =>
  props.capabilities.session_window ? props.conversation.window_open : true
);
const messageText = ref("");
const sending = ref(false);
const selectedTemplate = ref<{ label: string; value: string } | null>(null);

const sendLabel = computed(() => `${__("Send via")} ${props.label}`);
const composerPlaceholder = computed(
  () => `${__("Type a")} ${props.label} ${__("message…")}`
);

// ── Window countdown ─────────────────────────────────────────────────────────
const windowCountdown = ref("");

function updateCountdown() {
  if (!props.conversation.window_expires_at) {
    windowCountdown.value = __("Window open");
    return;
  }
  // Parse the naive server datetime string in site timezone (same as dayjsLocal in utils.ts).
  const diff = dayjsLocal(props.conversation.window_expires_at).diff(dayjsLocal(), "minute");
  if (diff <= 0) {
    windowCountdown.value = __("Window closing…");
    return;
  }
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  // Template literal: __ spread-args only accept individual values, not arrays.
  windowCountdown.value = hours > 0
    ? `${__("Window closes in")} ${hours}h ${minutes}m`
    : `${__("Window closes in")} ${minutes}m`;
}

updateCountdown();
const _timer = setInterval(updateCountdown, 60000);
onUnmounted(() => clearInterval(_timer));

// ── Template picker ───────────────────────────────────────────────────────────
const templatesResource = createResource({
  url: "helpdesk.api.channels.list_templates",
  params: { channel: props.channel },
  method: "GET",
  auto: true,
});

const templateOptions = computed(() => {
  const templates = templatesResource.data?.templates ?? [];
  return templates.map((t: any) => ({
    label: `${t.template_name} (${t.language_code})`,
    value: t.name,
    description: t.template,
  }));
});

const templatePreview = computed(() => {
  if (!selectedTemplate.value) return "";
  const templates = templatesResource.data?.templates ?? [];
  const t = templates.find((x: any) => x.name === selectedTemplate.value?.value);
  return t?.template ?? "";
});

// ── Send ─────────────────────────────────────────────────────────────────────
const sendResource = createResource({
  url: "helpdesk.api.channels.send",
  onSuccess() {
    sending.value = false;
    messageText.value = "";
    selectedTemplate.value = null;
    emit("sent");
    toast.success(__("Message sent."));
  },
  onError(err: any) {
    sending.value = false;
    const msg =
      err?.messages?.[0] ||
      err?.message ||
      __("Failed to send message.");
    toast.error(msg);
  },
});

function sendMessage() {
  if (!messageText.value.trim()) return;
  sending.value = true;
  sendResource.submit({
    channel: props.channel,
    conversation: props.conversation.name,
    message: messageText.value.trim(),
  });
}

function sendTemplate() {
  if (!selectedTemplate.value) return;
  sending.value = true;
  sendResource.submit({
    channel: props.channel,
    conversation: props.conversation.name,
    template: selectedTemplate.value.value,
  });
}
</script>

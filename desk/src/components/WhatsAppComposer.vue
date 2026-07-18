<template>
  <!-- WhatsApp reply composer. Shown only when thread is available. -->
  <div class="overflow-hidden">
    <div class="px-5 py-3 border-t border-outline-gray-modals">
      <!-- Window state chip -->
      <div class="mb-3 flex items-center gap-2">
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

      <!-- Free-text area (window open) -->
      <div v-if="windowOpen" class="flex flex-col gap-2">
        <textarea
          v-model="messageText"
          :placeholder="__('Type a WhatsApp message…')"
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
            :label="sending ? __('Sending…') : __('Send via WhatsApp')"
            :loading="sending"
            :disabled="!messageText.trim() || sending"
            @click="sendMessage"
          />
        </div>
      </div>

      <!-- Template picker (window closed) -->
      <div v-else class="flex flex-col gap-2">
        <div class="text-p-sm text-ink-gray-5 mb-1">
          {{ __("Select a pre-approved template to re-engage the customer.") }}
        </div>
        <Autocomplete
          :options="templateOptions"
          v-model="selectedTemplate"
          :placeholder="__('Search templates…')"
          class="w-full"
        />
        <div v-if="selectedTemplate" class="rounded border border-outline-gray-2 bg-surface-gray-1 px-3 py-2 text-p-sm text-ink-gray-7 mt-1">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { __ } from "@/translation";
import { Autocomplete } from "@/components";
import { Badge, Button, createResource, toast } from "frappe-ui";
import { computed, onUnmounted, ref, watch } from "vue";
import type { WaConversation } from "@/composables/useWhatsAppThread";

const props = defineProps<{
  conversation: WaConversation;
  ticketId: string;
}>();

const emit = defineEmits(["discard", "sent"]);

const windowOpen = computed(() => props.conversation.window_open);
const messageText = ref("");
const sending = ref(false);
const selectedTemplate = ref<{ label: string; value: string } | null>(null);

// ── Window countdown ─────────────────────────────────────────────────────────
const windowCountdown = ref("");

function updateCountdown() {
  if (!props.conversation.window_expires_at) {
    windowCountdown.value = __("Window open");
    return;
  }
  const diff = new Date(props.conversation.window_expires_at).getTime() - Date.now();
  if (diff <= 0) {
    windowCountdown.value = __("Window closing…");
    return;
  }
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    windowCountdown.value = __("Window closes in {0}h {1}m", [hours, minutes]);
  } else {
    windowCountdown.value = __("Window closes in {0}m", [minutes]);
  }
}

updateCountdown();
const _timer = setInterval(updateCountdown, 60000);
onUnmounted(() => clearInterval(_timer));

// ── Template picker ───────────────────────────────────────────────────────────
const templatesResource = createResource({
  url: "axe_helpdesk_wa.api.list_templates",
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
  url: "axe_helpdesk_wa.api.send_whatsapp",
  onSuccess() {
    sending.value = false;
    messageText.value = "";
    selectedTemplate.value = null;
    emit("sent");
    toast.success(__("WhatsApp message sent."));
  },
  onError(err: any) {
    sending.value = false;
    const msg =
      err?.messages?.[0] ||
      err?.message ||
      __("Failed to send WhatsApp message.");
    toast.error(msg);
  },
});

function sendMessage() {
  if (!messageText.value.trim()) return;
  sending.value = true;
  sendResource.submit({
    conversation: props.conversation.name,
    message: messageText.value.trim(),
  });
}

function sendTemplate() {
  if (!selectedTemplate.value) return;
  sending.value = true;
  sendResource.submit({
    conversation: props.conversation.name,
    template: selectedTemplate.value.value,
  });
}
</script>

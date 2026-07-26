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
      <div v-if="windowOpen && !showTemplates" class="flex flex-col gap-2">
        <textarea
          ref="textareaRef"
          v-model="messageText"
          :placeholder="composerPlaceholder"
          class="w-full resize-none rounded-md border border-outline-gray-2 bg-surface-white px-3 py-2 text-p-base text-ink-gray-8 placeholder:text-ink-gray-4 focus:border-outline-gray-4 focus:outline-none min-h-[80px]"
          dir="auto"
        />

        <!-- Attachments chips (media capability only) -->
        <div v-if="attachments.length" class="flex flex-wrap gap-2">
          <AttachmentItem
            v-for="a in attachments"
            :key="a.file_url"
            :label="a.file_name"
            :url="a.file_url"
          >
            <template #suffix>
              <FeatherIcon
                class="h-3.5"
                name="x"
                @click.self.stop="removeAttachment(a)"
              />
            </template>
          </AttachmentItem>
        </div>

        <!-- Formatting toolbar + action buttons -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1">
            <!-- Formatting buttons: wire-format markers from the channel manifest -->
            <button
              v-for="fmt in formatButtons"
              :key="fmt.marker"
              class="flex rounded p-1 text-ink-gray-8 transition-colors hover:bg-surface-gray-3 text-xs font-mono"
              :title="__(fmt.label)"
              @click="wrapSelection(fmt.marker)"
            >{{ fmt.icon }}</button>

            <div v-if="formatButtons.length" class="h-4 w-[2px] border-s mx-1" />

            <!-- Attach (media capability only) -->
            <!-- ponytail: public upload — Meta fetches by link; upgrade path is Meta's media-upload API (binary → media id) in axon send modules. -->
            <FileUploader
              v-if="capabilities.media"
              :upload-args="{
                doctype: 'HD Ticket',
                docname: ticketId,
                private: false,
              }"
              @success="(f) => attachments.push(f)"
            >
              <template #default="{ openFileSelector, uploading }">
                <button
                  class="flex rounded p-1 text-ink-gray-8 transition-colors hover:bg-surface-gray-3"
                  :disabled="uploading"
                  :title="__('Attach file')"
                  @click="openFileSelector()"
                >
                  <FeatherIcon name="paperclip" class="h-4 w-4" />
                </button>
              </template>
            </FileUploader>

            <!-- Saved Replies -->
            <button
              class="flex rounded p-1 text-ink-gray-8 transition-colors hover:bg-surface-gray-3"
              :title="__('Saved replies')"
              @click="showSavedReplies = true"
            >
              <FeatherIcon name="book-open" class="h-4 w-4" />
            </button>

            <!-- Switch to template (templates capability, window open) -->
            <button
              v-if="capabilities.templates"
              class="flex rounded p-1 text-ink-gray-8 transition-colors hover:bg-surface-gray-3 text-p-xs"
              :title="__('Send a template')"
              @click="showTemplates = true"
            >
              <FeatherIcon name="layout" class="h-4 w-4" />
            </button>
          </div>

          <div class="flex gap-2">
            <Button
              label="Discard"
              @click="emit('discard')"
            />
            <Button
              variant="solid"
              :label="sending ? __('Sending…') : sendLabel"
              :loading="sending"
              :disabled="(!messageText.trim() && !attachments.length) || sending"
              @click="sendMessage"
            />
          </div>
        </div>
      </div>

      <!-- Template picker (window closed + templates capability, OR showTemplates toggled) -->
      <div v-else-if="capabilities.templates && (!windowOpen || showTemplates)" class="flex flex-col gap-2">
        <!-- Back button (only shown when window is open and user toggled to templates) -->
        <button
          v-if="windowOpen && showTemplates"
          class="self-start flex items-center gap-1 text-p-sm text-ink-gray-5 hover:text-ink-gray-8"
          @click="showTemplates = false"
        >
          <FeatherIcon name="arrow-left" class="h-3.5 w-3.5" />
          {{ __("Back to message") }}
        </button>
        <div v-else class="text-p-sm text-ink-gray-5 mb-1">
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

  <SavedRepliesSelectorModal
    v-model="showSavedReplies"
    doctype="HD Ticket"
    :ticketId="ticketId"
    @apply="applySavedReply"
  />
</template>

<script setup lang="ts">
import { __ } from "@/translation";
import { AttachmentItem, SavedRepliesSelectorModal } from "@/components";
import { Autocomplete } from "@/components";
import { removeAttachmentFromServer } from "@/utils";
import { Badge, Button, FeatherIcon, FileUploader, call, createResource, dayjsLocal, toast } from "frappe-ui";
import { computed, nextTick, onUnmounted, ref } from "vue";
import type { ChannelConversation } from "@/composables/useChannelThread";

const props = defineProps<{
  conversation: ChannelConversation;
  ticketId: string;
  channel: string;
  label: string;
  capabilities: Record<string, boolean>;
  textMarkers?: { marker: string; label: string; icon: string }[];
}>();

const emit = defineEmits(["discard", "sent"]);

// When the channel has no session window (capability off), replies are always allowed.
const windowOpen = computed(() =>
  props.capabilities.session_window ? props.conversation.window_open : true
);
const messageText = ref("");
const sending = ref(false);
const selectedTemplate = ref<{ label: string; value: string } | null>(null);
const showTemplates = ref(false);
const showSavedReplies = ref(false);
const attachments = ref<any[]>([]);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const sendLabel = computed(() => `${__("Send via")} ${props.label}`);
const composerPlaceholder = computed(
  () => `${__("Type a")} ${props.label} ${__("message…")}`
);

// ── Formatting toolbar ────────────────────────────────────────────────────────
// Marker set comes from the channel manifest (`text_markers`) — wire-format
// syntax is the plugin adapter's business, not the fork's.
const formatButtons = computed(() => props.textMarkers ?? []);

async function wrapSelection(marker: string) {
  const el = textareaRef.value;
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const text = messageText.value;
  messageText.value = text.slice(0, start) + marker + text.slice(start, end) + marker + text.slice(end);
  await nextTick();
  el.focus();
  // Empty selection: cursor between the markers so the user types inside them.
  const newPos = start === end ? start + marker.length : end + marker.length * 2;
  el.setSelectionRange(newPos, newPos);
}

// ── Saved replies ─────────────────────────────────────────────────────────────
// HTML → wire-format conversion is dispatched to the channel's adapter
// (helpdesk.api.channels.format_html); the fork stays channel-agnostic.
async function applySavedReply(html: string) {
  let converted = "";
  try {
    const res = await call("helpdesk.api.channels.format_html", {
      channel: props.channel,
      html,
    });
    converted = res?.text ?? "";
  } catch {
    toast.error(__("Could not format the saved reply for this channel"));
    return;
  }
  const el = textareaRef.value;
  if (el) {
    const start = el.selectionStart;
    const text = messageText.value;
    messageText.value = text.slice(0, start) + converted + text.slice(start);
  } else {
    messageText.value += converted;
  }
}

// ── Attachments ───────────────────────────────────────────────────────────────
async function removeAttachment(attachment: any) {
  attachments.value = attachments.value.filter((a) => a !== attachment);
  await removeAttachmentFromServer(attachment.name);
}

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
    attachments.value = [];
    showTemplates.value = false;
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
  if (!messageText.value.trim() && !attachments.value.length) return;
  sending.value = true;
  sendResource.submit({
    channel: props.channel,
    conversation: props.conversation.name,
    message: messageText.value.trim() || undefined,
    attachments: attachments.value.length
      ? JSON.stringify(attachments.value.map((a) => a.file_url))
      : undefined,
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

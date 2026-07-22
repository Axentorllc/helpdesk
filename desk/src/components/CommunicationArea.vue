<template>
  <div class="comm-area">
    <div
      class="flex justify-between gap-3 border-t px-6 md:px-5 py-4 md:py-2.5"
    >
      <div class="flex gap-1.5 items-center">
        <Button
          ref="sendEmailRef"
          variant="ghost"
          label="Reply"
          :class="[
            showEmailBox ? '!bg-surface-gray-4 hover:!bg-surface-gray-3' : '',
          ]"
          @click="toggleEmailBox()"
        >
          <template #prefix>
            <EmailIcon class="h-4" />
          </template>
        </Button>
        <Button
          variant="ghost"
          label="Comment"
          :class="[
            showCommentBox ? '!bg-surface-gray-4 hover:!bg-surface-gray-3' : '',
          ]"
          @click="toggleCommentBox()"
        >
          <template #prefix>
            <CommentIcon class="h-4" />
          </template>
        </Button>
        <!-- Channel toggles: one per available channel thread (feature-detected) -->
        <Button
          v-for="c in channelComposers"
          :key="c.channel_key"
          variant="ghost"
          :label="c.label"
          :class="[
            activeComposerChannel === c.channel_key ? '!bg-surface-gray-4 hover:!bg-surface-gray-3' : '',
          ]"
          @click="toggleChannelBox(c.channel_key)"
        >
          <template #prefix>
            <component :is="channelIcon(c.icon)" class="h-4" />
          </template>
        </Button>
        <TypingIndicator :ticketId="ticketId" />
      </div>
    </div>
    <Transition name="slide">
      <div
        v-show="showEmailBox"
        ref="emailBoxRef"
        @keydown.ctrl.enter.capture.stop="submitEmail"
        @keydown.meta.enter.capture.stop="submitEmail"
        @keydown.esc.capture.stop="showEmailBox = false"
      >
        <div class="overflow-hidden">
          <EmailEditor
            ref="emailEditorRef"
            :label="
              isMobileView ? 'Send' : isMac ? 'Send (⌘ + ⏎)' : 'Send (Ctrl + ⏎)'
            "
            placeholder="Hi John, we are looking into this issue."
            :ticketId="ticketId"
            :to-emails="toEmails"
            :cc-emails="ccEmails"
            :bcc-emails="bccEmails"
            @submit="
              () => {
                showEmailBox = false;
                emit('update');
              }
            "
            @discard="
              () => {
                showEmailBox = false;
              }
            "
          />
        </div>
      </div>
    </Transition>
    <Transition name="slide">
      <div
        v-show="showCommentBox"
        ref="commentBoxRef"
        @keydown.ctrl.enter.capture.stop="submitComment"
        @keydown.meta.enter.capture.stop="submitComment"
        @keydown.esc.capture.stop="showCommentBox = false"
      >
        <div class="overflow-hidden">
          <CommentTextEditor
            ref="commentTextEditorRef"
            :label="
              isMobileView
                ? 'Comment'
                : isMac
                ? 'Comment (⌘ + ⏎)'
                : 'Comment (Ctrl + ⏎)'
            "
            :ticketId="ticketId"
            :editable="showCommentBox"
            :doctype="doctype"
            placeholder="@John could you please look into this?"
            @submit="
              () => {
                showCommentBox = false;
                emit('update');
              }
            "
            @discard="
              () => {
                showCommentBox = false;
              }
            "
          />
        </div>
      </div>
    </Transition>
    <!-- Channel composers: one per available channel, shown when its toggle is active -->
    <Transition name="slide" v-for="c in channelComposers" :key="c.channel_key">
      <div v-show="activeComposerChannel === c.channel_key">
        <ChannelComposer
          :conversation="c.conversation"
          :ticket-id="ticketId"
          :channel="c.channel_key"
          :label="c.label"
          :capabilities="c.capabilities"
          @discard="activeComposerChannel = null"
          @sent="
            () => {
              activeComposerChannel = null;
              emit('channel-sent', c.channel_key);
            }
          "
        />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { CommentTextEditor, EmailEditor, TypingIndicator } from "@/components";
import { CommentIcon, EmailIcon } from "@/components/icons/";
import ChannelComposer from "@/components/ChannelComposer.vue";
import { channelIcon } from "@/stores/channels";
import { useDevice } from "@/composables";
import { useScreenSize } from "@/composables/screen";
import { useShortcut } from "@/composables/shortcuts";
import { showCommentBox, showEmailBox } from "@/pages/ticket/modalStates";
import { onClickOutside } from "@vueuse/core";
import { computed, ref, watch } from "vue";

const emit = defineEmits(["update", "channel-sent"]);
const content = defineModel("content");
const { isMac } = useDevice();
const { isMobileView } = useScreenSize();
let doc = defineModel();
// let doc = inject(TicketSymbol)?.value.doc
const emailEditorRef = ref(null);
const commentTextEditorRef = ref(null);
const emailBoxRef = ref(null);
const commentBoxRef = ref(null);
// Which channel's composer is open (mutually exclusive with email/comment boxes).
const activeComposerChannel = ref<string | null>(null);

const props = defineProps({
  doctype: {
    type: String,
    default: "HD Ticket",
  },
  ticketId: {
    type: String,
    default: null,
  },
  toEmails: {
    type: Array,
    default: () => [],
  },
  ccEmails: {
    type: Array,
    default: () => [],
  },
  bccEmails: {
    type: Array,
    default: () => [],
  },
  // Channel threads passed from TicketActivityPanel (feature-detected), one per
  // manifest channel: { channel_key, label, icon, capabilities, thread }.
  channelThreads: {
    type: Array,
    default: () => [],
  },
});

// Only channels that are available AND have a conversation on this ticket get a
// toggle + composer; conversation is unwrapped here so the template stays clean.
const channelComposers = computed(() =>
  (props.channelThreads ?? [])
    .filter(
      (ch: any) => ch.thread?.available?.value && ch.thread?.conversation?.value != null
    )
    .map((ch: any) => ({
      channel_key: ch.channel_key,
      label: ch.label,
      icon: ch.icon,
      capabilities: ch.capabilities,
      conversation: ch.thread.conversation.value,
    }))
);

function toggleEmailBox() {
  if (showCommentBox.value) {
    showCommentBox.value = false;
  }
  activeComposerChannel.value = null;
  showEmailBox.value = !showEmailBox.value;
}

function toggleCommentBox() {
  if (showEmailBox.value) {
    showEmailBox.value = false;
  }
  activeComposerChannel.value = null;
  showCommentBox.value = !showCommentBox.value;
}

function toggleChannelBox(channelKey: string) {
  if (showEmailBox.value) {
    showEmailBox.value = false;
  }
  if (showCommentBox.value) {
    showCommentBox.value = false;
  }
  activeComposerChannel.value =
    activeComposerChannel.value === channelKey ? null : channelKey;
}

function submitEmail() {
  if (emailEditorRef.value.submitMail()) {
    emit("update");
  }
}

function submitComment() {
  if (commentTextEditorRef.value.submitComment()) {
    emit("update");
  }
}

function splitIfString(str: string | string[]) {
  if (typeof str === "string") {
    return str.split(",");
  }
  return str;
}

function replyToEmail(data: object) {
  showEmailBox.value = true;

  emailEditorRef.value.addToReply(
    data.content,
    splitIfString(data.to),
    splitIfString(data.cc),
    splitIfString(data.bcc)
  );
}

watch(
  () => showEmailBox.value,
  (value) => {
    if (value) {
      emailEditorRef.value?.editor?.commands?.focus("start");
    }
  }
);

watch(
  () => showCommentBox.value,
  (value) => {
    if (value) {
      commentTextEditorRef.value?.editor?.commands?.focus();
    }
  }
);

useShortcut("r", () => {
  toggleEmailBox();
});
useShortcut("c", () => {
  toggleCommentBox();
});

defineExpose({
  replyToEmail,
  toggleEmailBox,
  toggleCommentBox,
  editor: emailEditorRef,
});

const IGNORED_SELECTORS = [
  ".tippy-box",
  ".tippy-content",
  ".PopoverContent",
  '[role="dialog"]',
  '[role="menu"]',
  ".dialog-overlay",
];

onClickOutside(
  emailBoxRef,
  () => {
    if (showEmailBox.value) {
      showEmailBox.value = false;
    }
  },
  {
    ignore: IGNORED_SELECTORS,
  }
);

onClickOutside(
  commentBoxRef,
  () => {
    if (showCommentBox.value) {
      showCommentBox.value = false;
    }
  },
  {
    ignore: IGNORED_SELECTORS,
  }
);
</script>

<style>
@media screen and (max-width: 640px) {
  .comm-area {
    width: 100vw;
  }
}

.slide-enter-active,
.slide-leave-active {
  display: grid;
  transition: grid-template-rows 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  grid-template-rows: 0fr;
}
.slide-enter-to,
.slide-leave-from {
  grid-template-rows: 1fr;
}
</style>

<template>
  <div
    v-if="showHeader"
    class="mx-6 md:mx-10 md:my-2 flex items-center justify-between text-lg-medium mb-4 !mt-6 md:h-8 md:text-2xl md:font-semibold md:text-ink-gray-8"
  >
    Activity
  </div>
  <div class="relative min-h-0 grow">
  <div ref="scrollEl" class="h-full overflow-auto px-5 md:px-10">
    <div
      v-for="(c, i) in communications"
      :id="c.name"
      :key="c.name"
      class="flex items-between justify-center gap-4 relative"
      :class="i === 0 && 'mt-4'"
    >
      <div
        class="w-full activity grid grid-cols-[30px_minmax(auto,_1fr)] gap-2 sm:gap-4 h-full"
      >
        <div
          class="relative flex justify-center after:absolute after:left-[50%] after:top-3 after:-z-10 after:border-l after:border-outline-gray-modals"
          :class="[
            i != communications.length - 1 ? 'after:h-full' : 'after:h-5',
          ]"
        >
          <Avatar
            size="lg"
            :label="c.user.name"
            :image="c.user.image"
            class="mt-1.5 relative"
          />
        </div>
        <TicketCommunication
          :content="c.content"
          :date="c.creation"
          :user="c.user"
          :sender-image="c.sender"
          :cc="c.cc || ''"
          :bcc="c.bcc || ''"
          :attachments="c.attachments"
        />
      </div>
    </div>
  </div>
  <NewMessagePill v-if="showPill" @click="scrollToBottom(true)" />
  </div>
</template>

<script setup lang="ts">
import { useSmartScroll } from "@/composables/useSmartScroll";
import { isElementInViewport } from "@/utils";
import { Avatar } from "frappe-ui";
import { computed, inject, nextTick, ref, watch } from "vue";
import { useRoute } from "vue-router";
import NewMessagePill from "@/components/NewMessagePill.vue";
import TicketCommunication from "./TicketCommunication.vue";
import { ITicket } from "./symbols";

interface P {
  focus?: string;
  showHeader?: boolean;
}

const props = withDefaults(defineProps<P>(), {
  focus: "",
  showHeader: true,
});
const route = useRoute();
const ticket = inject(ITicket);

const scrollEl = ref<HTMLElement | null>(null);
const { showPill, scrollToBottom, onNewContent } = useSmartScroll(scrollEl);

const communications = computed(() => {
  const _communications = ticket.data.communications || [];
  return _communications.sort(
    (a, b) => new Date(a.creation) - new Date(b.creation)
  );
});

watch(
  () => communications.value.length,
  (n, old) => { if (n > old) onNewContent(); }
);

function scroll(id: string) {
  const e = document.getElementById(id);
  if (!isElementInViewport(e)) {
    e.scrollIntoViewIfNeeded();
  }
}

watch(
  () => props.focus,
  (id: string) => scroll(id)
);
nextTick(() => {
  const hash = route.hash.slice(1);
  const id = hash || communications.value.slice(-1).pop()?.name;
  if (id) setTimeout(() => scroll(id), 1000);
});

defineExpose({ scrollToBottom });
</script>

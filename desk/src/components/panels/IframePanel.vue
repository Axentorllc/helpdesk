<!--
  Generic iframe side-panel renderer. Embeds panel.src with the current ticket
  id appended as a query param, inside a collapsible Section. Contributed via
  the helpdesk_ticket_panels hook.
-->
<template>
  <Section :label="panel.title" v-model:opened="opened">
    <template #header="{ opened, toggle }">
      <div
        class="flex gap-2.5 items-center justify-between sticky top-0 bg-surface-white z-10 px-4 py-4 cursor-pointer"
        @click="toggle"
      >
        <span class="text-ink-gray-8 font-semibold text-base select-none">
          {{ __(panel.title) }}
        </span>
        <LucideChevronRight
          class="size-4 text-ink-gray-6"
          :class="{ 'rotate-90': opened }"
        />
      </div>
    </template>
    <!-- ponytail: no postMessage bridge yet — add when a real consumer needs it -->
    <iframe
      :src="panel.src! + (panel.src!.includes('?') ? '&' : '?') + 'ticket=' + ticketId"
      class="w-full"
      sandbox="allow-scripts allow-same-origin"
    />
  </Section>
</template>

<script setup lang="ts">
import { __ } from "@/translation";
import { TicketSymbol } from "@/types";
import { PanelManifestEntry } from "@/stores/channels";
import { computed, inject, ref } from "vue";
import LucideChevronRight from "~icons/lucide/chevron-right";
import Section from "../Section.vue";

const props = defineProps<{ panel: PanelManifestEntry }>();

const ticket = inject(TicketSymbol)!;
const ticketId = computed(() => ticket.value?.doc?.name);

const opened = ref(true);
</script>

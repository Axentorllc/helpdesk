<!--
  Generic HTML side-panel renderer. Fetches server-rendered `html` (trusted,
  escaped server-side) from panel.api and renders it in a collapsible Section.
  When condition_field is set, its current ticket value is passed to the API so
  a reload triggered by an in-UI change reflects it immediately (no
  read-after-write race). Contributed via the helpdesk_ticket_panels hook.
-->
<template>
  <div v-if="hasPanel">
    <Section :label="panel.title" v-model:opened="opened">
      <template #header="{ opened, toggle }">
        <div
          class="flex gap-2.5 items-center justify-between sticky top-0 bg-surface-white z-10 px-4 py-4 cursor-pointer"
          @click="toggle"
        >
          <span class="text-ink-gray-8 font-semibold text-base select-none">
            {{ __(panel.title) }}
          </span>
          <div class="flex items-center gap-2">
            <button
              class="text-ink-gray-5 hover:text-ink-gray-8"
              :title="__('Refresh')"
              @click.stop="refresh"
            >
              <LucideRefreshCw
                class="size-3.5"
                :class="{ 'animate-spin': resource.loading }"
              />
            </button>
            <LucideChevronRight
              class="size-4 text-ink-gray-6"
              :class="{ 'rotate-90': opened }"
            />
          </div>
        </div>
      </template>
      <div class="px-4 pb-4 mt-0.5" v-html="resource.data.html" />
    </Section>
  </div>
</template>

<script setup lang="ts">
import { __ } from "@/translation";
import { TicketSymbol } from "@/types";
import { PanelManifestEntry } from "@/stores/channels";
import { createResource } from "frappe-ui";
import { computed, inject, ref, watch } from "vue";
import LucideChevronRight from "~icons/lucide/chevron-right";
import LucideRefreshCw from "~icons/lucide/refresh-cw";
import Section from "../Section.vue";

const props = defineProps<{ panel: PanelManifestEntry }>();

const ticket = inject(TicketSymbol)!;
const ticketId = computed(() => ticket.value?.doc?.name);

// Set only for a manual refresh so the backend can log one event per click
// (auto-load and the condition-field reload below don't set it).
const wantRefresh = ref(false);

const resource = createResource({
  url: props.panel.api!,
  makeParams: () => ({
    ticket: ticketId.value,
    refresh: wantRefresh.value ? 1 : 0,
    // Pass the condition value the client already knows so an in-UI change
    // reload reflects it immediately (no read-after-write race).
    ...(props.panel.condition_field
      ? { [props.panel.condition_field]: ticket.value?.doc?.[props.panel.condition_field] || undefined }
      : {}),
  }),
  auto: true,
  onSuccess: () => {
    wantRefresh.value = false;
  },
  onError: () => {
    wantRefresh.value = false;
  },
});

function refresh() {
  wantRefresh.value = true;
  resource.reload();
}

// When the condition field changes, re-pull (no refresh flag).
watch(
  () => (props.panel.condition_field ? ticket.value?.doc?.[props.panel.condition_field] : undefined),
  (nv, ov) => {
    if (props.panel.condition_field && nv !== ov) resource.reload();
  }
);

const opened = ref(true);

const hasPanel = computed(() => Boolean(resource.data?.html));
</script>

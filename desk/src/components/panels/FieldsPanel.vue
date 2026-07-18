<!--
  Generic read-only fields side-panel renderer. Fetches {fields:[{label,value}]}
  from panel.api and renders label/value rows in a collapsible Section.
  Contributed via the helpdesk_ticket_panels hook.
-->
<template>
  <div v-if="resource.data?.fields?.length">
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
      <div class="px-4 pb-4 mt-0.5 space-y-2">
        <div
          v-for="(field, i) in resource.data.fields"
          :key="i"
          class="flex items-start justify-between gap-2"
        >
          <span class="text-sm text-ink-gray-5 shrink-0">{{ field.label }}</span>
          <span class="text-sm text-ink-gray-9 text-right">{{ field.value }}</span>
        </div>
      </div>
    </Section>
  </div>
</template>

<script setup lang="ts">
import { __ } from "@/translation";
import { TicketSymbol } from "@/types";
import { PanelManifestEntry } from "@/stores/channels";
import { createResource } from "frappe-ui";
import { inject, ref } from "vue";
import LucideChevronRight from "~icons/lucide/chevron-right";
import Section from "../Section.vue";

const props = defineProps<{ panel: PanelManifestEntry }>();

const ticket = inject(TicketSymbol)!;

const resource = createResource({
  url: props.panel.api!,
  makeParams: () => ({ ticket: ticket.value?.doc?.name }),
  auto: true,
});

const opened = ref(true);
</script>

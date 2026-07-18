<!--
  Host for manifest-driven ticket side panels. Renders each panel entry with the
  renderer matching its `type` (html|relations|fields|iframe). Panels are
  contributed by plugin apps via the helpdesk_ticket_panels hook and surfaced
  through the channels store. Keying each renderer by ticket id remounts it on a
  ticket switch so its auto-loaded resource refetches (the renderers hold no
  ticketId watcher of their own).
-->
<template>
  <template v-for="panel in visiblePanels" :key="panel.panel_key + ':' + ticketId">
    <component :is="RENDERERS[panel.type]" :panel="panel" />
  </template>
</template>

<script setup lang="ts">
import { TicketSymbol } from "@/types";
import { PanelManifestEntry } from "@/stores/channels";
import { computed, inject, type Component } from "vue";
import HtmlPanel from "../panels/HtmlPanel.vue";
import RelationsPanel from "../panels/RelationsPanel.vue";
import FieldsPanel from "../panels/FieldsPanel.vue";
import IframePanel from "../panels/IframePanel.vue";

const props = defineProps<{ panels: PanelManifestEntry[] }>();

const ticket = inject(TicketSymbol)!;
const ticketId = computed(() => ticket.value?.doc?.name);

const RENDERERS: Record<PanelManifestEntry["type"], Component> = {
  html: HtmlPanel,
  relations: RelationsPanel,
  fields: FieldsPanel,
  iframe: IframePanel,
};

// Drop panels gated on a ticket field that's empty (condition_field) so we
// don't fire an API call for a record that isn't linked.
const visiblePanels = computed(() =>
  props.panels.filter(
    (p) => !p.condition_field || Boolean(ticket.value?.doc?.[p.condition_field])
  )
);
</script>

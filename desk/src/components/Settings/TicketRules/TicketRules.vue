<template>
  <TicketRulesList
    v-if="!activeRule"
    ref="listRef"
    @open="activeRule = $event"
  />
  <TicketRuleView
    v-else
    :rule="activeRule"
    @back="onBack"
  />
</template>

<script setup lang="ts">
import { ref } from "vue";
import TicketRulesList from "./TicketRulesList.vue";
import TicketRuleView from "./TicketRuleView.vue";

const activeRule = ref(null);
const listRef = ref<{ reload: () => void } | null>(null);

function onBack() {
  activeRule.value = null;
  // Reload list so name/condition/action summaries update after a save.
  listRef.value?.reload();
}
</script>

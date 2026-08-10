<template>
  <TeamAssignmentList
    v-if="!activePolicy"
    ref="listRef"
    @open="activePolicy = $event"
  />
  <TeamAssignmentView
    v-else
    :policy="activePolicy"
    @back="onBack"
  />
</template>

<script setup lang="ts">
import { ref } from "vue";
import TeamAssignmentList from "./TeamAssignmentList.vue";
import TeamAssignmentView from "./TeamAssignmentView.vue";

const activePolicy = ref(null);
const listRef = ref(null);

function onBack() {
  activePolicy.value = null;
  // Reload list so routing_condition summary updates after a save.
  listRef.value?.reload();
}
</script>

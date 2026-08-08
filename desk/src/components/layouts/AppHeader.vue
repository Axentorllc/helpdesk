<template>
  <div class="flex border-b pe-5 rtl:pe-6">
    <!-- flex-col + order classes on teleported children keep the header above the
         SLA strip regardless of teleport re-append order (split/classic toggle) -->
    <div id="app-header" class="flex flex-col flex-1 w-full"></div>
    <div class="flex items-start justify-center">
      <CallUI :userEmail="user" />
    </div>
  </div>
</template>

<script setup>
import CallUI from "@/components/telephony/CallUI.vue";
import { useAuthStore } from "@/stores/auth";
import { useTelephonyStore } from "@/stores/telephony";
import { onMounted } from "vue";

const { user } = useAuthStore();

const telephonyStore = useTelephonyStore();

onMounted(() => {
  telephonyStore.fetchCallIntegrationStatus();
});
</script>

<template>
  <button
    class="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 max-sm:fixed max-sm:bottom-16 flex items-center gap-1.5 rounded-full border border-outline-gray-2 bg-surface-white px-3 py-1.5 text-sm text-ink-gray-8 shadow-md"
  >
    {{ __("New messages") }}
    <FeatherIcon name="chevron-down" class="size-3.5" />
  </button>
</template>

<script setup lang="ts">
import { FeatherIcon } from "frappe-ui";
import { __ } from "@/translation";
</script>

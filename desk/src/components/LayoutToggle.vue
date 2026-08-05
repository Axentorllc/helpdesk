<template>
  <div class="flex gap-1">
    <Button
      :variant="splitView ? 'ghost' : 'subtle'"
      icon="lucide-align-justify"
      :aria-label="__('List view')"
      @click="setLayout('classic')"
    />
    <Button
      :variant="splitView ? 'subtle' : 'ghost'"
      icon="lucide-panel-right"
      :aria-label="__('Split view')"
      @click="setLayout('split')"
    />
  </div>
</template>

<script setup lang="ts">
// Explicit buttons instead of TabButtons: its fallback normalization can emit
// update:modelValue unprompted, which silently flipped the persisted preference.
import { useLayoutPreference } from "@/composables/useLayoutPreference";
import { __ } from "@/translation";
import { Button } from "frappe-ui";

const { splitView, setLayout } = useLayoutPreference();
</script>

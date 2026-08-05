<template>
  <div class="flex gap-1">
    <Tooltip :text="__('List view')">
      <Button
        :variant="splitView ? 'ghost' : 'subtle'"
        :class="!splitView && '!bg-surface-gray-4'"
        icon="lucide-align-justify"
        :aria-label="__('List view')"
        @click="setLayout('classic')"
      />
    </Tooltip>
    <Tooltip :text="__('Split view')">
      <Button
        :variant="splitView ? 'subtle' : 'ghost'"
        :class="splitView && '!bg-surface-gray-4'"
        icon="lucide-panel-right"
        :aria-label="__('Split view')"
        @click="setLayout('split')"
      />
    </Tooltip>
  </div>
</template>

<script setup lang="ts">
// Explicit buttons instead of TabButtons: its fallback normalization can emit
// update:modelValue unprompted, which silently flipped the persisted preference.
import { useLayoutPreference } from "@/composables/useLayoutPreference";
import { __ } from "@/translation";
import { Button, Tooltip } from "frappe-ui";

const { splitView, setLayout } = useLayoutPreference();
</script>

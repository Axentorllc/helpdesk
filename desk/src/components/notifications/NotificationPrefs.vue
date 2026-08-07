<template>
  <Popover v-if="available">
    <template #target="{ togglePopover }">
      <Button
        theme="gray"
        variant="ghost"
        @click="togglePopover()"
      >
        <template #icon>
          <LucideSettings class="h-4 w-4" />
        </template>
      </Button>
    </template>
    <template #body-main>
      <div class="notification-prefs-popover w-56 p-3 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-ink-gray-8">Customer replies</span>
          <Switch
            size="sm"
            :model-value="prefs.Reply"
            @update:model-value="(v) => setPref('Reply', v)"
          />
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-ink-gray-8">Mentions</span>
          <Switch
            size="sm"
            :model-value="prefs.Mention"
            @update:model-value="(v) => setPref('Mention', v)"
          />
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-ink-gray-8">Assignments</span>
          <Switch
            size="sm"
            :model-value="prefs.Assignment"
            @update:model-value="(v) => setPref('Assignment', v)"
          />
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-ink-gray-8">Reactions</span>
          <Switch
            size="sm"
            :model-value="prefs.Reaction"
            @update:model-value="(v) => setPref('Reaction', v)"
          />
        </div>
        <div class="border-t pt-2">
          <a
            href="/push-settings"
            class="text-sm text-ink-blue-3 hover:underline"
          >Push settings &rarr;</a>
        </div>
      </div>
    </template>
  </Popover>
</template>

<script setup lang="ts">
import { Popover, Switch } from "frappe-ui";
import LucideSettings from "~icons/lucide/settings";
import { useNotificationPrefs } from "@/composables/useNotificationPrefs";

const { prefs, available, setPref } = useNotificationPrefs();
</script>

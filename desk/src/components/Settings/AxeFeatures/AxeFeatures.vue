<template>
  <SettingsLayoutBase>
    <template #title>
      <h1 class="text-lg-semibold text-ink-gray-8">
        {{ __("Axe Features") }}
      </h1>
    </template>
    <template #description>
      <p class="text-p-sm max-w-md text-ink-gray-6">
        {{
          __(
            "Platform feature toggles. Manager-facing configuration (routing, eligibility, skills, windows, valves) lives in Team Assignment."
          )
        }}
      </p>
    </template>
    <template #content>
      <!-- Loading -->
      <div
        v-if="features.loading && !features.data"
        class="flex items-center justify-center absolute inset-x-0 top-5.5 bottom-0"
      >
        <LoadingIndicator class="w-4" />
      </div>

      <div v-else>
        <!-- Error -->
        <p v-if="features.error" class="text-p-sm text-ink-red-6">
          {{ __("Could not load features.") }}
        </p>

        <div v-else class="flex flex-col divide-y divide-outline-gray-1">
          <div
            v-for="row in featureList"
            :key="row.key"
            class="flex items-center justify-between py-3"
          >
            <div class="flex flex-col gap-0.5">
              <span class="text-base text-ink-gray-8">{{ __(row.label) }}</span>
              <span class="text-p-sm text-ink-gray-6">{{ __(row.description) }}</span>
            </div>
            <Switch
              size="sm"
              :model-value="Boolean(row.enabled)"
              @update:model-value="(val) => toggle(row, val)"
            />
          </div>
        </div>
      </div>
    </template>
  </SettingsLayoutBase>
</template>

<script setup lang="ts">
import { LoadingIndicator, Switch, call, createResource, toast } from "frappe-ui";
import { computed } from "vue";
import SettingsLayoutBase from "@/components/layouts/SettingsLayoutBase.vue";
import { __ } from "@/translation";

const features = createResource({
  url: "axe_helpdesk.api.settings.get_features",
  auto: true,
});

const featureList = computed<any[]>(() => features.data ?? []);

async function toggle(row: any, val: boolean) {
  const prev = row.enabled;
  row.enabled = val; // optimistic
  try {
    await call("axe_helpdesk.api.settings.save_features", {
      features: { [row.key]: val ? 1 : 0 },
    });
  } catch (e: any) {
    row.enabled = prev; // revert
    toast.error(e?.messages?.[0] || __("Failed to update feature."));
  }
}
</script>

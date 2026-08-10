<template>
  <SettingsLayoutBase>
    <template #title>
      <h1 class="text-lg-semibold text-ink-gray-8">
        {{ __("Team Assignment") }}
      </h1>
    </template>
    <template #description>
      <p class="text-p-sm max-w-md text-ink-gray-6">
        {{
          __(
            "Configure which tickets each team handles, how they are distributed, and who is eligible to receive them."
          )
        }}
      </p>
    </template>
    <template #header-actions>
      <Button
        v-if="teamsWithoutPolicy.length"
        :label="__('Add')"
        theme="gray"
        variant="solid"
        icon-left="lucide-plus"
        class="rtl:flex-row-reverse"
        @click="showAddDialog = true"
      />
    </template>
    <template #content>
      <div
        v-if="overview.loading && !overview.data"
        class="flex items-center justify-center absolute inset-x-0 top-5.5 bottom-0"
      >
        <LoadingIndicator class="w-4" />
      </div>
      <div v-else>
        <!-- Empty state -->
        <div
          v-if="!policies.length && !teamsWithoutPolicy.length"
          class="flex flex-col items-center justify-center gap-4 h-full"
        >
          <div
            class="p-4 size-14.5 rounded-full bg-surface-gray-1 flex justify-center items-center"
          >
            <NetworkIcon class="size-6 text-ink-gray-6" />
          </div>
          <div class="flex flex-col items-center gap-1">
            <div class="text-base-medium text-ink-gray-6">
              {{ __("No policies found") }}
            </div>
            <div class="text-p-sm text-ink-gray-5 max-w-60 text-center">
              {{ __("Create a team first, then add an assignment policy.") }}
            </div>
          </div>
        </div>

        <div v-else>
          <!-- Column headers -->
          <div class="grid grid-cols-12 items-center gap-4 text-sm text-ink-gray-5 ms-2">
            <div class="col-span-1"></div>
            <div class="col-span-4">{{ __("Team") }}</div>
            <div class="col-span-3">{{ __("Distribution") }}</div>
            <div class="col-span-2">{{ __("Scope") }}</div>
            <div class="col-span-2">{{ __("Enabled") }}</div>
          </div>
          <hr class="mt-2 mx-2" />

          <!-- Draggable policy rows -->
          <Draggable
            :list="policies"
            item-key="name"
            handle=".drag-handle"
            @end="onReorder"
          >
            <template #item="{ element: policy }">
              <div>
                <div
                  class="grid grid-cols-12 items-center gap-4 cursor-pointer hover:bg-surface-sidebar rounded group"
                >
                  <div class="col-span-1 flex justify-center">
                    <DragIcon class="h-3.5 text-ink-gray-4 drag-handle cursor-grab opacity-0 group-hover:opacity-100" />
                  </div>
                  <div
                    class="col-span-4 h-14 flex flex-col justify-center"
                    @click="emit('open', policy)"
                  >
                    <div class="text-base-medium text-ink-gray-7">{{ policy.team }}</div>
                    <div
                      v-if="policy.routing_condition"
                      class="text-sm text-ink-gray-5 mt-1 truncate"
                    >
                      {{ policy.routing_condition }}
                    </div>
                    <div v-else class="text-sm text-ink-gray-4 mt-1 italic">
                      {{ __("No routing condition") }}
                    </div>
                  </div>
                  <div class="col-span-3" @click="emit('open', policy)">
                    <Badge
                      v-if="policy.distribution"
                      :label="policy.distribution"
                      theme="blue"
                      variant="subtle"
                    />
                  </div>
                  <div class="col-span-2" @click="emit('open', policy)">
                    <Badge
                      v-if="policy.assignment_scope"
                      :label="policy.assignment_scope"
                      theme="gray"
                      variant="subtle"
                      class="truncate max-w-full"
                    />
                  </div>
                  <div class="col-span-2 flex items-center">
                    <Switch
                      size="sm"
                      :model-value="Boolean(policy.enabled)"
                      @update:model-value="(v) => toggleEnabled(policy, v)"
                    />
                  </div>
                </div>
                <hr class="mx-2" />
              </div>
            </template>
          </Draggable>

          <!-- Teams without policy — greyed "Add" rows -->
          <div
            v-for="t in teamsWithoutPolicy"
            :key="t.team"
            class="grid grid-cols-12 items-center gap-4 rounded opacity-50 cursor-pointer hover:opacity-70"
            @click="addPolicyForTeam(t.team)"
          >
            <div class="col-span-1"></div>
            <div class="col-span-10 h-14 flex items-center gap-2">
              <FeatherIcon name="plus-circle" class="h-4 text-ink-gray-4" />
              <span class="text-base text-ink-gray-5">{{ t.team }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </SettingsLayoutBase>

  <!-- Add policy dialog -->
  <Dialog :title="__('Add Assignment Policy')" v-model:open="showAddDialog">
    <template #default>
      <div class="flex flex-col gap-4">
        <FormControl
          :label="__('Team')"
          type="select"
          v-model="addTeam"
          :options="teamsWithoutPolicy.map((t) => ({ label: t.team, value: t.team }))"
        />
      </div>
    </template>
    <template #actions>
      <div class="flex gap-2 justify-end">
        <Button variant="subtle" :label="__('Cancel')" @click="showAddDialog = false" />
        <Button
          variant="solid"
          :label="__('Add')"
          :disabled="!addTeam"
          @click="confirmAdd"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import {
  Badge,
  Button,
  call,
  createResource,
  Dialog,
  FeatherIcon,
  FormControl,
  LoadingIndicator,
  Switch,
  toast,
} from "frappe-ui";
import { computed, ref } from "vue";
import Draggable from "vuedraggable";
import { DragIcon } from "@/components/icons";
import SettingsLayoutBase from "@/components/layouts/SettingsLayoutBase.vue";
import { __ } from "@/translation";
import NetworkIcon from "~icons/lucide/network";

const emit = defineEmits<{
  (e: "open", policy: any): void;
}>();

const showAddDialog = ref(false);
const addTeam = ref("");

const overview = createResource({
  url: "axe_helpdesk.api.team_assignment.get_overview",
  auto: true,
});

const policies = computed(() => overview.data?.policies ?? []);
const teamsWithoutPolicy = computed(() => overview.data?.teams_without_policy ?? []);

async function toggleEnabled(policy, val: boolean) {
  const prev = policy.enabled;
  policy.enabled = val ? 1 : 0;
  try {
    await call("axe_helpdesk.api.team_assignment.save_policy", {
      policy: { ...policy, enabled: val ? 1 : 0 },
    });
  } catch {
    policy.enabled = prev;
    toast.error(__("Failed to update policy."));
  }
}

async function onReorder() {
  try {
    await call("axe_helpdesk.api.team_assignment.reorder", {
      names: policies.value.map((p) => p.name),
    });
  } catch {
    toast.error(__("Failed to save order."));
    overview.reload();
  }
}

function addPolicyForTeam(team: string) {
  addTeam.value = team;
  showAddDialog.value = true;
}

async function confirmAdd() {
  if (!addTeam.value) return;
  try {
    await call("axe_helpdesk.api.team_assignment.save_policy", {
      policy: { team: addTeam.value },
    });
    showAddDialog.value = false;
    addTeam.value = "";
    overview.reload();
  } catch {
    toast.error(__("Failed to create policy."));
  }
}

// Expose reload for parent to call after returning from detail view.
defineExpose({ reload: () => overview.reload() });
</script>

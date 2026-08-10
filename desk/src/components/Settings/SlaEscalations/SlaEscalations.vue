<template>
  <SettingsLayoutBase>
    <template #title>
      <h1 class="text-lg-semibold text-ink-gray-8">
        {{ __("SLA Escalations") }}
      </h1>
    </template>
    <template #description>
      <p class="text-p-sm max-w-md text-ink-gray-6">
        {{
          __(
            "Notify, bump priority, or re-route tickets before and after SLA deadlines slip."
          )
        }}
      </p>
    </template>
    <template #content>
      <!-- Loading -->
      <div
        v-if="escalations.loading && !escalations.data"
        class="flex items-center justify-center absolute inset-x-0 top-5.5 bottom-0"
      >
        <LoadingIndicator class="w-4" />
      </div>

      <div v-else>
        <!-- Error -->
        <p v-if="escalations.error" class="text-p-sm text-ink-red-6">
          {{ (escalations.error as any)?.messages?.[0] || (escalations.error as any)?.message || __("Failed to load escalations.") }}
        </p>

        <!-- Feature-disabled banner -->
        <div
          v-if="!slaPlusEnabled"
          class="rounded-md bg-surface-gray-1 border border-outline-gray-2 px-4 py-3 mb-6"
        >
          <span class="text-p-sm text-ink-gray-6">
            {{
              __(
                "The SLA escalations feature is currently disabled — configured escalations will not fire until it is enabled."
              )
            }}
          </span>
        </div>

        <!-- Per-SLA groups -->
        <div
          v-for="slaGroup in slaGroups"
          :key="slaGroup.name"
          class="mb-8"
        >
          <!-- Subheading + Add button -->
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-base-semibold text-ink-gray-8">
              {{ slaGroup.name }}
            </h2>
            <Button
              :label="__('Add escalation')"
              variant="outline"
              @click="openAdd(slaGroup.name)"
            />
          </div>

          <!-- Empty hint -->
          <p
            v-if="!slaGroup.escalations.length"
            class="text-p-sm text-ink-gray-5 italic"
          >
            {{ __("No escalations for this policy.") }}
          </p>

          <!-- Escalation rows -->
          <div v-else class="flex flex-col">
            <div
              v-for="esc in slaGroup.escalations"
              :key="esc.name"
              class="flex items-center gap-3 py-3 px-2 rounded group hover:bg-surface-sidebar cursor-pointer border-b border-outline-gray-1 last:border-b-0"
              @click="openEdit(slaGroup.name, esc)"
            >
              <!-- Name -->
              <div class="flex-1 min-w-0">
                <div class="text-base-medium text-ink-gray-8 truncate">
                  {{ esc.escalation_name }}
                </div>
                <!-- Actions summary -->
                <div class="text-p-sm text-ink-gray-5 mt-0.5 truncate">
                  {{ actionSummary(esc) }}
                </div>
              </div>

              <!-- Badges -->
              <div class="flex items-center gap-2 flex-shrink-0">
                <Badge :label="__(esc.target)" theme="blue" variant="subtle" />
                <Badge
                  :label="__(esc.stage)"
                  :theme="esc.stage === 'Pre-breach' ? 'orange' : 'red'"
                  variant="subtle"
                />
                <Badge
                  v-if="esc.stage === 'Pre-breach' && esc.threshold_minutes"
                  :label="__(`{0} min before`, [String(esc.threshold_minutes)])"
                  theme="gray"
                  variant="subtle"
                />
              </div>

              <!-- Enabled switch -->
              <Switch
                size="sm"
                :model-value="Boolean(esc.enabled)"
                @update:model-value="(v) => toggleEnabled(esc, v)"
                @click.stop
              />

              <!-- Delete -->
              <Button
                variant="ghost"
                theme="gray"
                icon="lucide-trash-2"
                class="opacity-0 group-hover:opacity-100"
                @click.stop="askDelete(esc)"
              />
            </div>
          </div>
        </div>

        <!-- Fully empty state (no SLAs at all) -->
        <div
          v-if="!escalations.loading && slaGroups.length === 0 && !escalations.error"
          class="flex flex-col items-center justify-center gap-4 h-full"
        >
          <div
            class="p-4 size-14.5 rounded-full bg-surface-gray-1 flex justify-center items-center"
          >
            <ShieldCheck class="size-6 text-ink-gray-6" />
          </div>
          <div class="flex flex-col items-center gap-1">
            <div class="text-base-medium text-ink-gray-6">
              {{ __("No SLA policies found") }}
            </div>
            <div class="text-p-sm text-ink-gray-5 max-w-60 text-center">
              {{ __("Create an SLA policy first, then add escalations.") }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </SettingsLayoutBase>

  <!-- Add / Edit dialog -->
  <EscalationDialog
    v-model:open="showDialog"
    :sla="dialogSla"
    :escalation="dialogEscalation"
    @saved="escalations.reload()"
  />

  <!-- Delete confirmation -->
  <Dialog :title="__('Delete escalation')" v-model:open="showDeleteDialog">
    <template #default>
      <p class="text-p-base text-ink-gray-7">
        {{
          __("Delete escalation {0}? This cannot be undone.", [
            pendingDelete?.escalation_name,
          ])
        }}
      </p>
    </template>
    <template #actions>
      <div class="flex gap-2 justify-end">
        <Button
          variant="subtle"
          :label="__('Cancel')"
          @click="showDeleteDialog = false"
        />
        <Button
          theme="red"
          variant="solid"
          :label="__('Delete')"
          :loading="deleting"
          @click="confirmDelete"
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
  LoadingIndicator,
  Switch,
  toast,
} from "frappe-ui";
import { computed, ref } from "vue";
import SettingsLayoutBase from "@/components/layouts/SettingsLayoutBase.vue";
import { __ } from "@/translation";
import ShieldCheck from "~icons/lucide/shield-check";
import EscalationDialog from "./EscalationDialog.vue";

const escalations = createResource({
  url: "axe_helpdesk.api.sla_plus.get_escalations",
  auto: true,
});

const slaPlusEnabled = computed<boolean>(
  () => escalations.data?.sla_plus_enabled !== false
);

const slaGroups = computed<any[]>(() => escalations.data?.slas ?? []);

// Dialog state
const showDialog = ref(false);
const dialogSla = ref("");
const dialogEscalation = ref<any>(null);

function openAdd(slaName: string) {
  dialogSla.value = slaName;
  dialogEscalation.value = null;
  showDialog.value = true;
}

function openEdit(slaName: string, esc: any) {
  dialogSla.value = slaName;
  dialogEscalation.value = esc;
  showDialog.value = true;
}

// Delete state
const showDeleteDialog = ref(false);
const pendingDelete = ref<any>(null);
const deleting = ref(false);

function askDelete(esc: any) {
  pendingDelete.value = esc;
  showDeleteDialog.value = true;
}

async function confirmDelete() {
  if (!pendingDelete.value) return;
  deleting.value = true;
  try {
    await call("axe_helpdesk.api.sla_plus.delete_escalation", {
      name: pendingDelete.value.name,
    });
    showDeleteDialog.value = false;
    pendingDelete.value = null;
    escalations.reload();
  } catch (e: any) {
    toast.error(e?.messages?.[0] || __("Failed to delete escalation."));
  } finally {
    deleting.value = false;
  }
}

async function toggleEnabled(esc: any, val: boolean) {
  const prev = esc.enabled;
  esc.enabled = val;
  try {
    await call("axe_helpdesk.api.sla_plus.save_escalation", {
      escalation: { ...esc, enabled: val },
    });
  } catch (e: any) {
    esc.enabled = prev;
    toast.error(e?.messages?.[0] || __("Failed to update escalation."));
  }
}

function actionSummary(esc: any): string {
  const parts: string[] = [];
  if (esc.notify_assignee) parts.push(__("Notify assignee"));
  if (esc.notify_managers) parts.push(__("Notify managers"));
  if (esc.bump_priority) parts.push(__("Priority → {0}", [esc.bump_priority]));
  if (esc.reassign_overflow) parts.push(__("Re-route to overflow"));
  return parts.length ? parts.join(" · ") : __("No actions configured");
}
</script>

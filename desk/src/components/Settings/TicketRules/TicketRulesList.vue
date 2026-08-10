<template>
  <SettingsLayoutBase>
    <template #title>
      <h1 class="text-lg-semibold text-ink-gray-8">
        {{ __("Ticket Rules") }}
      </h1>
    </template>
    <template #description>
      <p class="text-p-sm max-w-md text-ink-gray-6">
        {{
          __(
            "Automate ticket fields: on creation or update, when conditions match, set fields."
          )
        }}
      </p>
    </template>
    <template #header-actions>
      <div class="flex items-center gap-2">
        <Button
          :label="__('Test rules')"
          variant="outline"
          @click="showSimulator = true"
        />
        <Button
          :label="__('New rule')"
          theme="gray"
          variant="solid"
          icon-left="lucide-plus"
          class="rtl:flex-row-reverse"
          @click="openAddDialog"
        />
      </div>
    </template>
    <template #content>
      <div
        v-if="rules.loading && !rules.data"
        class="flex items-center justify-center absolute inset-x-0 top-5.5 bottom-0"
      >
        <LoadingIndicator class="w-4" />
      </div>
      <div v-else>
        <!-- Empty state -->
        <div
          v-if="!list.length"
          class="flex flex-col items-center justify-center gap-4 h-full"
        >
          <div
            class="p-4 size-14.5 rounded-full bg-surface-gray-1 flex justify-center items-center"
          >
            <NetworkIcon class="size-6 text-ink-gray-6" />
          </div>
          <div class="flex flex-col items-center gap-1">
            <div class="text-base-medium text-ink-gray-6">
              {{ __("No rules yet") }}
            </div>
            <div class="text-p-sm text-ink-gray-5 max-w-72 text-center">
              {{
                __(
                  "Rules run in order — first matching rule can stop the rest."
                )
              }}
            </div>
          </div>
        </div>

        <div v-else>
          <!-- Column headers -->
          <div
            class="grid grid-cols-12 items-center gap-4 text-sm text-ink-gray-5 ms-2"
          >
            <div class="col-span-1"></div>
            <div class="col-span-4">{{ __("Rule") }}</div>
            <div class="col-span-2">{{ __("Event") }}</div>
            <div class="col-span-3">{{ __("Actions") }}</div>
            <div class="col-span-2">{{ __("Enabled") }}</div>
          </div>
          <hr class="mt-2 mx-2" />

          <!-- Draggable rule rows -->
          <Draggable
            :list="list"
            item-key="name"
            handle=".drag-handle"
            @end="onReorder"
          >
            <template #item="{ element: rule }">
              <div>
                <div
                  class="grid grid-cols-12 items-center gap-4 cursor-pointer hover:bg-surface-sidebar rounded group"
                >
                  <div class="col-span-1 flex justify-center">
                    <DragIcon
                      class="h-3.5 text-ink-gray-4 drag-handle cursor-grab opacity-0 group-hover:opacity-100"
                    />
                  </div>
                  <div
                    class="col-span-4 h-14 flex flex-col justify-center"
                    @click="emit('open', rule)"
                  >
                    <div class="text-base-medium text-ink-gray-7">
                      {{ rule.rule_name }}
                    </div>
                    <div
                      v-if="rule.condition"
                      class="text-sm text-ink-gray-5 mt-1 truncate"
                    >
                      {{ rule.condition }}
                    </div>
                    <div v-else class="text-sm text-ink-gray-4 mt-1 italic">
                      {{ __("Always matches") }}
                    </div>
                  </div>
                  <div class="col-span-2" @click="emit('open', rule)">
                    <Badge
                      :label="__(rule.event)"
                      :theme="rule.event === 'Creation' ? 'blue' : 'orange'"
                      variant="subtle"
                    />
                  </div>
                  <div
                    class="col-span-3 text-sm text-ink-gray-6 truncate"
                    @click="emit('open', rule)"
                  >
                    {{ actionSummary(rule) }}
                  </div>
                  <div class="col-span-2 flex items-center gap-2">
                    <Switch
                      size="sm"
                      :model-value="Boolean(rule.enabled)"
                      @update:model-value="(v) => toggleEnabled(rule, v)"
                    />
                    <Button
                      variant="ghost"
                      theme="gray"
                      icon="lucide-trash-2"
                      class="opacity-0 group-hover:opacity-100"
                      @click.stop="askDelete(rule)"
                    />
                  </div>
                </div>
                <hr class="mx-2" />
              </div>
            </template>
          </Draggable>
        </div>
      </div>
    </template>
  </SettingsLayoutBase>

  <!-- Rules simulator dialog -->
  <RulesSimulator v-model:open="showSimulator" />

  <!-- New rule dialog -->
  <Dialog :title="__('New rule')" v-model:open="showAddDialog">
    <template #default>
      <div class="flex flex-col gap-4">
        <FormControl
          :label="__('Rule name')"
          type="text"
          v-model="addName"
          :placeholder="__('e.g. Escalate urgent hardware')"
        />
        <FormControl
          :label="__('Event')"
          type="select"
          v-model="addEvent"
          :options="eventOptions"
        />
      </div>
    </template>
    <template #actions>
      <div class="flex gap-2 justify-end">
        <Button
          variant="subtle"
          :label="__('Cancel')"
          @click="showAddDialog = false"
        />
        <Button
          variant="solid"
          :label="__('Create')"
          :disabled="!addName.trim()"
          :loading="creating"
          @click="confirmAdd"
        />
      </div>
    </template>
  </Dialog>

  <!-- Delete confirmation dialog -->
  <Dialog :title="__('Delete rule')" v-model:open="showDeleteDialog">
    <template #default>
      <p class="text-p-base text-ink-gray-7">
        {{
          __("Delete rule {0}? This cannot be undone.", [
            pendingDelete?.rule_name,
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
import RulesSimulator from "./RulesSimulator.vue";

const emit = defineEmits<{
  (e: "open", rule: any): void;
}>();

const showAddDialog = ref(false);
const showSimulator = ref(false);
const showDeleteDialog = ref(false);
const addName = ref("");
const addEvent = ref("Creation");
const creating = ref(false);
const deleting = ref(false);
const pendingDelete = ref<any>(null);

const eventOptions = [
  { label: __("Creation"), value: "Creation" },
  { label: __("Update"), value: "Update" },
];

// Field code → human label for the action summary.
const FIELD_LABELS: Record<string, string> = {
  priority: __("Priority"),
  ticket_type: __("Ticket Type"),
  agent_group: __("Team"),
  status: __("Status"),
};

const rules = createResource({
  url: "axe_helpdesk.api.ticket_rules.get_rules",
  auto: true,
});

const list = computed<any[]>(() => rules.data ?? []);

function actionSummary(rule: any): string {
  const actions = rule.actions ?? [];
  if (!actions.length) return __("No actions");
  if (actions.length === 1) {
    const a = actions[0];
    return `${FIELD_LABELS[a.field] || a.field} → ${a.value}`;
  }
  return __("{0} actions", [String(actions.length)]);
}

async function toggleEnabled(rule: any, val: boolean) {
  const prev = rule.enabled;
  rule.enabled = val ? 1 : 0;
  try {
    await call("axe_helpdesk.api.ticket_rules.save_rule", {
      rule: { ...rule, enabled: val ? 1 : 0 },
    });
  } catch {
    rule.enabled = prev;
    toast.error(__("Failed to update rule."));
  }
}

async function onReorder() {
  try {
    await call("axe_helpdesk.api.ticket_rules.reorder", {
      names: list.value.map((r) => r.name),
    });
  } catch {
    toast.error(__("Failed to save order."));
    rules.reload();
  }
}

function openAddDialog() {
  addName.value = "";
  addEvent.value = "Creation";
  showAddDialog.value = true;
}

async function confirmAdd() {
  if (!addName.value.trim()) return;
  creating.value = true;
  try {
    const saved = await call("axe_helpdesk.api.ticket_rules.save_rule", {
      rule: { rule_name: addName.value.trim(), event: addEvent.value },
    });
    showAddDialog.value = false;
    rules.reload();
    // Jump straight into the editor for the created rule (carries name/rule_order).
    emit("open", saved);
  } catch (e: any) {
    toast.error(e?.messages?.[0] || __("Failed to create rule."));
  } finally {
    creating.value = false;
  }
}

function askDelete(rule: any) {
  pendingDelete.value = rule;
  showDeleteDialog.value = true;
}

async function confirmDelete() {
  if (!pendingDelete.value) return;
  deleting.value = true;
  try {
    await call("axe_helpdesk.api.ticket_rules.delete_rule", {
      name: pendingDelete.value.name,
    });
    showDeleteDialog.value = false;
    pendingDelete.value = null;
    rules.reload();
  } catch (e: any) {
    toast.error(e?.messages?.[0] || __("Failed to delete rule."));
  } finally {
    deleting.value = false;
  }
}

// Expose reload for parent to call after returning from detail view.
defineExpose({ reload: () => rules.reload() });
</script>

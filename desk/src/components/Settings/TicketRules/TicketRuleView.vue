<template>
  <SettingsLayoutBase
    :back-label="props.rule?.rule_name || __('Rule')"
    :on-back="goBack"
    :dirty="isDirty"
  >
    <template #header-actions>
      <div class="flex items-center gap-4">
        <div
          class="flex items-center justify-between gap-2 cursor-pointer"
          @click="form.enabled = !form.enabled"
        >
          <Switch size="sm" :model-value="Boolean(form.enabled)" />
          <span class="text-sm text-ink-gray-7">{{ __("Enabled") }}</span>
        </div>
        <Button
          :label="__('Save')"
          theme="gray"
          variant="solid"
          :disabled="!isDirty"
          :loading="saving"
          @click="save"
        />
      </div>
    </template>
    <template #content>
      <!-- Condition -->
      <div>
        <div class="flex flex-col gap-1">
          <span class="text-lg-semibold text-ink-gray-8">{{
            __("Condition")
          }}</span>
          <span class="text-p-sm text-ink-gray-6">
            {{ __("Leave empty to match every ticket.") }}
          </span>
        </div>
        <div class="mt-5">
          <!-- Desk-authored python condition warning — same styling as blueprint -->
          <div
            v-if="isLegacyCondition"
            class="flex flex-col gap-3 items-center text-center text-ink-gray-7 text-sm mb-2 border border-outline-gray-2 rounded-md p-3 py-4"
          >
            <span class="text-p-sm">
              {{
                __(
                  "This rule's condition was authored in desk as a Python expression. Editing here will replace it."
                )
              }}
            </span>
            <code
              class="text-xs text-ink-gray-5 bg-surface-gray-1 rounded px-2 py-1 max-w-full break-all text-start"
              >{{ props.rule.condition }}</code
            >
          </div>
          <div
            v-if="conditionJson.length === 0"
            class="flex p-4 items-center cursor-pointer justify-center gap-2 text-sm border border-outline-gray-2 text-ink-gray-5 rounded-md"
            @click="conditionJson.push(['', '', ''])"
          >
            <FeatherIcon name="plus" class="h-4" />
            {{ __("Add a condition") }}
          </div>
          <CFConditions v-else :conditions="conditionJson" :level="0" />
          <div v-if="conditionJson.length > 0" class="mt-2">
            <Dropdown v-slot="{ open }" :options="conditionDropdownOptions">
              <Button
                :icon-right="open ? 'lucide-chevron-up' : 'lucide-chevron-down'"
                :label="__('Add condition')"
              />
            </Dropdown>
          </div>
        </div>
      </div>

      <hr class="my-8" />

      <!-- Actions -->
      <div>
        <div class="flex flex-col gap-1">
          <span class="text-lg-semibold text-ink-gray-8">{{
            __("Actions")
          }}</span>
          <span class="text-p-sm text-ink-gray-6">
            {{ __("Fields to set when this rule matches.") }}
          </span>
        </div>
        <div class="mt-5 flex flex-col gap-3">
          <div
            v-for="(action, idx) in form.actions"
            :key="idx"
            class="flex items-end gap-3"
          >
            <div class="flex-1">
              <FormControl
                type="select"
                size="sm"
                variant="subtle"
                :label="__('Field')"
                :model-value="action.field"
                :options="fieldOptions"
                @update:model-value="(v: string) => onFieldChange(action, v)"
              />
            </div>
            <div class="flex-1">
              <FormControl
                type="select"
                size="sm"
                variant="subtle"
                :label="__('Value')"
                v-model="action.value"
                :options="valueOptions(action.field)"
              />
            </div>
            <Button
              variant="ghost"
              theme="gray"
              icon="lucide-x"
              class="mb-0.5"
              @click="form.actions.splice(idx, 1)"
            />
          </div>
          <div>
            <Button
              :label="__('Add action')"
              icon-left="lucide-plus"
              variant="subtle"
              class="rtl:flex-row-reverse"
              @click="form.actions.push({ field: 'priority', value: '' })"
            />
          </div>
        </div>
      </div>

      <hr class="my-8" />

      <!-- Behaviour -->
      <div>
        <div class="flex flex-col gap-1">
          <span class="text-lg-semibold text-ink-gray-8">{{
            __("Behaviour")
          }}</span>
        </div>
        <div class="mt-5 flex flex-col gap-5 max-w-md">
          <div>
            <FormControl
              type="select"
              size="sm"
              variant="subtle"
              :label="__('Event')"
              v-model="form.event"
              :options="eventOptions"
            />
            <p class="mt-1 text-xs text-ink-gray-5">{{ eventExplanation }}</p>
          </div>
          <div class="flex items-center gap-3">
            <Switch size="sm" v-model="form.stop_after_match" />
            <span class="text-base text-ink-gray-7">{{
              __("Stop after this rule matches")
            }}</span>
          </div>
        </div>
      </div>
    </template>
  </SettingsLayoutBase>
</template>

<script setup lang="ts">
import {
  Button,
  call,
  createResource,
  Dropdown,
  FeatherIcon,
  FormControl,
  Switch,
  toast,
} from "frappe-ui";
import { computed, reactive, ref } from "vue";
import CFConditions from "@/components/conditions-filter/CFConditions.vue";
import { filterableFields } from "@/components/conditions-filter/filterableFields";
import SettingsLayoutBase from "@/components/layouts/SettingsLayoutBase.vue";
import { __ } from "@/translation";
import { convertToConditions, validateConditions } from "@/utils";

const props = defineProps<{
  rule: {
    name?: string;
    rule_name: string;
    enabled?: number | boolean;
    event?: string;
    condition?: string;
    condition_json?: string;
    rule_order?: number;
    stop_after_match?: number | boolean;
    actions?: Array<{ field: string; value: string }>;
  };
}>();

const emit = defineEmits<{
  (e: "back"): void;
}>();

const saving = ref(false);

// Parse condition JSON from the rule (may be a JSON string or already an array).
function parseConditionJson(raw: string | any[] | undefined): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

const conditionJson = reactive<any[]>(
  parseConditionJson(props.rule.condition_json)
);

const form = reactive({
  enabled: props.rule.enabled ?? 1,
  event: props.rule.event ?? "Creation",
  stop_after_match: Boolean(props.rule.stop_after_match ?? 0),
  actions: (props.rule.actions ?? []).map((a) => ({
    field: a.field,
    value: a.value,
  })),
});

const initialSnapshot = ref(
  JSON.stringify({ form: { ...form }, cj: [...conditionJson] })
);

// True when a desk-authored python condition exists but json is empty/unparseable.
const isLegacyCondition = computed(
  () => Boolean(props.rule.condition) && conditionJson.length === 0
);

const isDirty = computed(() => {
  return (
    JSON.stringify({ form: { ...form }, cj: [...conditionJson] }) !==
    initialSnapshot.value
  );
});

const eventOptions = [
  { label: __("Creation"), value: "Creation" },
  { label: __("Update"), value: "Update" },
];

const eventExplanation = computed(() =>
  form.event === "Creation"
    ? __("Runs once, when a ticket is first created.")
    : __("Runs every time a ticket is updated.")
);

const fieldOptions = [
  { label: __("Priority"), value: "priority" },
  { label: __("Ticket Type"), value: "ticket_type" },
  { label: __("Team"), value: "agent_group" },
  { label: __("Status"), value: "status" },
];

// Static statuses — HD Ticket Status seeds these four (helpdesk/setup/install.py).
const statusOptions = [
  { label: __("Open"), value: "Open" },
  { label: __("Replied"), value: "Replied" },
  { label: __("Resolved"), value: "Resolved" },
  { label: __("Closed"), value: "Closed" },
];

const priorities = createResource({
  url: "frappe.client.get_list",
  params: {
    doctype: "HD Ticket Priority",
    limit_page_length: 0,
  },
  auto: true,
});

const ticketTypes = createResource({
  url: "frappe.client.get_list",
  params: {
    doctype: "HD Ticket Type",
    limit_page_length: 0,
  },
  auto: true,
});

const teams = createResource({
  url: "frappe.client.get_list",
  params: {
    doctype: "HD Team",
    filters: { disabled: 0 },
    limit_page_length: 0,
  },
  auto: true,
});

function docOptions(res: any) {
  return (res.data ?? []).map((d: any) => ({ label: d.name, value: d.name }));
}

function valueOptions(field: string) {
  if (field === "priority") return docOptions(priorities);
  if (field === "ticket_type") return docOptions(ticketTypes);
  if (field === "agent_group") return docOptions(teams);
  return statusOptions;
}

// Clear the value when the field changes so a stale value from another type doesn't persist.
function onFieldChange(action: { field: string; value: string }, field: string) {
  action.field = field;
  action.value = "";
}

// Condition builder add-condition dropdown
const conditionDropdownOptions = [
  {
    label: __("Add condition"),
    onClick: () => {
      if (!validateConditions(conditionJson)) return;
      conditionJson.push("and", ["", "", ""]);
    },
  },
  {
    label: __("Add condition group"),
    onClick: () => {
      conditionJson.push("and", [[]]);
    },
  },
];

function goBack() {
  emit("back");
}

async function save() {
  // Validate conditions before saving (empty condition is allowed — matches every ticket).
  if (conditionJson.length > 0 && !validateConditions(conditionJson)) {
    toast.error(__("Some conditions are incomplete. Please fill in all fields."));
    return;
  }
  // At least one action is required.
  if (!form.actions.length) {
    toast.error(__("Add at least one action before saving."));
    return;
  }
  if (form.actions.some((a) => !a.field || !a.value)) {
    toast.error(__("Every action needs a field and a value."));
    return;
  }

  saving.value = true;
  try {
    await call("axe_helpdesk.api.ticket_rules.save_rule", {
      rule: {
        name: props.rule.name,
        rule_name: props.rule.rule_name,
        enabled: form.enabled ? 1 : 0,
        event: form.event,
        condition:
          conditionJson.length > 0
            ? convertToConditions({
                conditions: conditionJson,
                fieldPrefix: "doc",
              })
            : "",
        condition_json: JSON.stringify(conditionJson),
        stop_after_match: form.stop_after_match ? 1 : 0,
        actions: form.actions.map((a) => ({ field: a.field, value: a.value })),
      },
    });
    toast.success(__("Rule saved."));
    initialSnapshot.value = JSON.stringify({
      form: { ...form },
      cj: [...conditionJson],
    });
    emit("back");
  } catch (e: any) {
    const msg = e?.messages?.[0] || __("Failed to save rule.");
    toast.error(msg);
  } finally {
    saving.value = false;
  }
}

// Ensure filterable fields are loaded for CFConditions
if (!filterableFields.fetched) {
  filterableFields.submit();
}
</script>

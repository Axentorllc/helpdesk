<template>
  <SettingsLayoutBase
    :back-label="props.policy?.team || __('Policy')"
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
      <!-- Routing -->
      <div>
        <div class="flex flex-col gap-1">
          <span class="text-lg-semibold text-ink-gray-8">{{ __("Routing") }}</span>
          <span class="text-p-sm text-ink-gray-6">
            {{ __("Tickets matching these conditions will be routed to this team.") }}
            <span class="text-ink-gray-5 italic">
              {{ __("For inbound email, use Raised By (email) — Contact/Customer are empty for first-time senders.") }}
            </span>
          </span>
        </div>
        <div class="mt-5">
          <!-- Desk-authored python condition warning — same styling as AssignmentRuleView -->
          <div
            v-if="isLegacyCondition"
            class="flex flex-col gap-3 items-center text-center text-ink-gray-7 text-sm mb-2 border border-outline-gray-2 rounded-md p-3 py-4"
          >
            <span class="text-p-sm">
              {{
                __(
                  "This policy's condition was authored in desk as a Python expression. Editing here will replace it."
                )
              }}
            </span>
            <code class="text-xs text-ink-gray-5 bg-surface-gray-1 rounded px-2 py-1 max-w-full break-all text-start">{{
              props.policy.routing_condition
            }}</code>
          </div>
          <div
            v-if="routingConditionJson.length === 0"
            class="flex p-4 items-center cursor-pointer justify-center gap-2 text-sm border border-outline-gray-2 text-ink-gray-5 rounded-md"
            @click="routingConditionJson.push(['', '', ''])"
          >
            <FeatherIcon name="plus" class="h-4" />
            {{ __("Add a condition") }}
          </div>
          <CFConditions
            v-else
            :conditions="routingConditionJson"
            :level="0"
          />
          <div v-if="routingConditionJson.length > 0" class="mt-2">
            <Dropdown
              v-slot="{ open }"
              :options="conditionDropdownOptions"
            >
              <Button
                :icon-right="open ? 'lucide-chevron-up' : 'lucide-chevron-down'"
                :label="__('Add condition')"
              />
            </Dropdown>
          </div>
        </div>
      </div>

      <hr class="my-8" />

      <!-- Active window -->
      <div>
        <div class="flex flex-col gap-1">
          <span class="text-lg-semibold text-ink-gray-8">{{ __("Active window") }}</span>
          <span class="text-p-sm text-ink-gray-6">
            {{ __("This policy only routes tickets between these times. Empty = always active; a window ending before it starts spans midnight.") }}
          </span>
        </div>
        <div class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormControl
            type="time"
            size="sm"
            variant="subtle"
            :label="__('Active from')"
            v-model="form.active_from_time"
          />
          <FormControl
            type="time"
            size="sm"
            variant="subtle"
            :label="__('Active to')"
            v-model="form.active_to_time"
          />
        </div>
      </div>

      <hr class="my-8" />

      <!-- Distribution -->
      <div>
        <div class="flex flex-col gap-1">
          <span class="text-lg-semibold text-ink-gray-8">{{ __("Distribution") }}</span>
          <span class="text-p-sm text-ink-gray-6">
            {{ __("How tickets are assigned among eligible team members.") }}
          </span>
        </div>
        <div class="mt-5 max-w-xs">
          <FormControl
            type="select"
            size="sm"
            variant="subtle"
            :label="__('Method')"
            v-model="form.distribution"
            :options="distributionOptions"
          />
        </div>
      </div>

      <hr class="my-8" />

      <!-- Workload -->
      <div>
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <span class="text-lg-semibold text-ink-gray-8">{{ __("Workload") }}</span>
            <Button
              icon="lucide-refresh-cw"
              variant="ghost"
              @click="workload.reload()"
            />
          </div>
          <span class="text-p-sm text-ink-gray-6">
            {{ __("Open assignments per member, live — total across all their teams.") }}
          </span>
        </div>
        <div class="mt-5 max-w-md">
          <div
            v-if="workload.loading && !workload.data"
            class="flex items-center justify-center py-4"
          >
            <LoadingIndicator class="w-4" />
          </div>
          <div
            v-else-if="workload.error"
            class="text-p-sm text-ink-gray-5"
          >
            {{ __("Could not load workload.") }}
          </div>
          <div
            v-else-if="!members.length"
            class="text-p-sm text-ink-gray-5"
          >
            {{ __("No members in this team.") }}
          </div>
          <div v-else class="flex flex-col gap-2">
            <div
              v-for="m in members"
              :key="m.user"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-2">
                <span class="text-base text-ink-gray-7">{{ m.full_name || m.user }}</span>
                <Badge
                  v-if="m.availability_category === 'Active'"
                  :label="m.availability || m.availability_category"
                  theme="green"
                />
                <Badge
                  v-else-if="m.availability_category === 'Away'"
                  :label="m.availability || m.availability_category"
                  theme="orange"
                  variant="subtle"
                />
                <Badge
                  v-else-if="m.availability_category === 'Unavailable'"
                  :label="m.availability || m.availability_category"
                  theme="gray"
                  variant="subtle"
                />
                <Badge
                  v-else
                  :label="__('No status')"
                  theme="gray"
                  variant="subtle"
                />
              </div>
              <span class="text-base-medium text-ink-gray-7">{{ m.open_tickets }}</span>
            </div>
          </div>
        </div>
      </div>

      <hr class="my-8" />

      <!-- Absences -->
      <div>
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <span class="text-lg-semibold text-ink-gray-8">{{ __("Absences") }}</span>
            <div class="flex items-center gap-2">
              <Button
                :label="__('Add absence')"
                variant="outline"
                @click="showAddAbsence = true"
              />
              <Button
                icon="lucide-refresh-cw"
                variant="ghost"
                @click="teamAbsences.reload()"
              />
            </div>
          </div>
          <span class="text-p-sm text-ink-gray-6">
            {{ __("Upcoming and current absences for this team's members. Absent agents receive no tickets.") }}
          </span>
        </div>
        <div class="mt-5 max-w-md">
          <div
            v-if="teamAbsences.loading && !teamAbsences.data"
            class="flex items-center justify-center py-4"
          >
            <LoadingIndicator class="w-4" />
          </div>
          <div v-else-if="teamAbsences.error" class="text-p-sm text-ink-gray-5">
            {{ __("Could not load absences.") }}
          </div>
          <div
            v-else-if="!absenceList.length"
            class="text-p-sm text-ink-gray-5"
          >
            {{ __("No upcoming absences.") }}
          </div>
          <div v-else class="flex flex-col gap-2">
            <div
              v-for="a in absenceList"
              :key="a.name"
              class="flex items-center justify-between group"
            >
              <div class="flex flex-col gap-0.5 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-base text-ink-gray-7">{{ a.full_name || a.agent_user }}</span>
                  <Badge
                    v-if="a.active"
                    :label="__('Active now')"
                    theme="orange"
                    variant="subtle"
                  />
                </div>
                <span class="text-p-sm text-ink-gray-6">{{ a.from_date }} → {{ a.to_date }}</span>
                <span v-if="a.note" class="text-p-sm text-ink-gray-5 truncate">{{ a.note }}</span>
              </div>
              <Button
                icon="lucide-trash-2"
                variant="ghost"
                theme="gray"
                class="opacity-0 group-hover:opacity-100 shrink-0"
                @click="askDeleteAbsence(a)"
              />
            </div>
          </div>
        </div>
      </div>

      <hr class="my-8" />

      <!-- Queue valve -->
      <div>
        <div class="flex flex-col gap-1">
          <span class="text-lg-semibold text-ink-gray-8">{{ __("Queue valve") }}</span>
          <span class="text-p-sm text-ink-gray-6">
            {{ __("Re-route or alert when tickets wait in the queue too long. Alerts repeat each valve period while the ticket stays queued.") }}
          </span>
        </div>
        <div class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <FormControl
              type="number"
              size="sm"
              variant="subtle"
              :label="__('Valve (minutes)')"
              v-model="form.queue_valve_minutes"
            />
            <p class="mt-1 text-xs text-ink-gray-5">{{ __("0 disables the valve.") }}</p>
          </div>
          <div>
            <FormControl
              type="select"
              size="sm"
              variant="subtle"
              :label="__('Overflow team')"
              v-model="form.overflow_team"
              :options="overflowTeamOptions"
            />
          </div>
        </div>
      </div>

      <hr class="my-8" />

      <!-- Eligibility -->
      <div>
        <div class="flex flex-col gap-1">
          <span class="text-lg-semibold text-ink-gray-8">{{ __("Eligibility") }}</span>
          <span class="text-p-sm text-ink-gray-6">
            {{ __("Control who can receive assignments from this policy.") }}
          </span>
        </div>
        <!-- Banner when assignment_policy feature is off — settings save but have no effect -->
        <div
          v-if="assignmentPolicyOff"
          class="flex flex-col gap-3 items-center text-center text-ink-gray-7 text-sm mt-4 border border-outline-gray-2 rounded-md p-3 py-4"
        >
          <span class="text-p-sm">
            {{
              __(
                "Eligibility settings (Gate by availability, Scope, Managers) have no effect because the Assignment Policy feature is disabled in Axe Helpdesk Settings. Enable it to activate these controls."
              )
            }}
          </span>
        </div>
        <div class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- Gate by availability -->
          <div class="flex items-center gap-3">
            <Switch size="sm" v-model="form.gate_by_availability" />
            <span class="text-base text-ink-gray-7">{{ __("Gate by availability") }}</span>
          </div>
          <!-- Include Away -->
          <div class="flex items-center gap-3">
            <Switch size="sm" v-model="form.include_away" />
            <span class="text-base text-ink-gray-7">{{ __("Include Away") }}</span>
          </div>
          <!-- Assignment Scope -->
          <div>
            <FormControl
              type="select"
              size="sm"
              variant="subtle"
              :label="__('Assignment Scope')"
              v-model="form.assignment_scope"
              :options="scopeOptions"
            />
          </div>
          <!-- Managers -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-ink-gray-5">{{ __("Managers") }}</label>
            <AgentSelector v-model="form.managers" />
          </div>
        </div>
      </div>
    </template>
  </SettingsLayoutBase>

  <!-- Delete absence dialog -->
  <Dialog :title="__('Remove absence')" v-model:open="showDeleteAbsence">
    <template #default>
      <p class="text-p-base text-ink-gray-7">
        {{ __("Remove absence for {0}? This cannot be undone.", [pendingDeleteAbsence?.full_name || pendingDeleteAbsence?.agent_user]) }}
      </p>
    </template>
    <template #actions>
      <div class="flex gap-2 justify-end">
        <Button variant="subtle" :label="__('Cancel')" @click="showDeleteAbsence = false" />
        <Button
          theme="red"
          variant="solid"
          :label="__('Remove')"
          :loading="deletingAbsence"
          @click="confirmDeleteAbsence"
        />
      </div>
    </template>
  </Dialog>

  <!-- Add absence dialog -->
  <Dialog :title="__('Add absence')" v-model:open="showAddAbsence">
    <template #default>
      <div class="flex flex-col gap-4">
        <FormControl
          type="select"
          :label="__('Agent')"
          v-model="absenceForm.agent"
          :options="memberOptions"
        />
        <FormControl
          type="date"
          :label="__('From')"
          v-model="absenceForm.from_date"
        />
        <FormControl
          type="date"
          :label="__('To')"
          v-model="absenceForm.to_date"
        />
        <FormControl
          type="text"
          :label="__('Note')"
          v-model="absenceForm.note"
          :placeholder="__('Optional')"
        />
        <p v-if="absenceFormError" class="text-p-sm text-ink-red-4">{{ absenceFormError }}</p>
      </div>
    </template>
    <template #actions>
      <div class="flex gap-2 justify-end">
        <Button variant="subtle" :label="__('Cancel')" @click="showAddAbsence = false" />
        <Button
          variant="solid"
          :label="__('Save')"
          :loading="savingAbsence"
          @click="confirmAddAbsence"
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
  Dropdown,
  FeatherIcon,
  FormControl,
  LoadingIndicator,
  Switch,
  toast,
} from "frappe-ui";
import { computed, onMounted, reactive, ref } from "vue";
import CFConditions from "@/components/conditions-filter/CFConditions.vue";
import { filterableFields } from "@/components/conditions-filter/filterableFields";
import SettingsLayoutBase from "@/components/layouts/SettingsLayoutBase.vue";
import AgentSelector from "@/components/Settings/Teams/components/AgentSelector.vue";
import { useAgentStore } from "@/stores/agent";
import { __ } from "@/translation";
import { convertToConditions, validateConditions } from "@/utils";

const props = defineProps<{
  policy: {
    name?: string;
    team: string;
    enabled?: number | boolean;
    routing_condition?: string;
    routing_condition_json?: string;
    routing_order?: number;
    assignment_scope?: string;
    include_away?: number | boolean;
    gate_by_availability?: number | boolean;
    managers?: string[];
    assignment_rule?: string;
    distribution?: string;
    queue_valve_minutes?: number;
    overflow_team?: string;
    active_from_time?: string | null;
    active_to_time?: string | null;
  };
}>();

const emit = defineEmits<{
  (e: "back"): void;
}>();

const saving = ref(false);

const workload = createResource({
  url: "axe_helpdesk.api.team_assignment.team_workload",
  params: { team: props.policy.team },
  auto: true,
});

const members = computed(() => workload.data?.members ?? []);

const teamAbsences = createResource({
  url: "axe_helpdesk.api.absences.team_absences",
  params: { team: props.policy.team },
  auto: true,
});

const absenceList = computed(() => teamAbsences.data ?? []);

const memberOptions = computed(() => [
  { label: __("Select agent"), value: "" },
  ...members.value.map((m: any) => ({
    label: m.full_name || m.user,
    value: m.user,
  })),
]);

const showDeleteAbsence = ref(false);
const deletingAbsence = ref(false);
const pendingDeleteAbsence = ref<any>(null);

const showAddAbsence = ref(false);
const savingAbsence = ref(false);
const absenceForm = reactive({ agent: "", from_date: "", to_date: "", note: "" });
const absenceFormError = ref("");

function askDeleteAbsence(a: any) {
  pendingDeleteAbsence.value = a;
  showDeleteAbsence.value = true;
}

async function confirmDeleteAbsence() {
  if (!pendingDeleteAbsence.value) return;
  deletingAbsence.value = true;
  try {
    await call("axe_helpdesk.api.absences.delete_absence", {
      name: pendingDeleteAbsence.value.name,
    });
    showDeleteAbsence.value = false;
    pendingDeleteAbsence.value = null;
    teamAbsences.reload();
  } catch (e: any) {
    toast.error(e?.messages?.[0] || __("Failed to remove absence."));
  } finally {
    deletingAbsence.value = false;
  }
}

async function confirmAddAbsence() {
  absenceFormError.value = "";
  if (!absenceForm.agent || !absenceForm.from_date || !absenceForm.to_date) {
    absenceFormError.value = __("Agent, From date, and To date are required.");
    return;
  }
  if (absenceForm.to_date < absenceForm.from_date) {
    absenceFormError.value = __("To date must be on or after From date.");
    return;
  }
  savingAbsence.value = true;
  try {
    await call("axe_helpdesk.api.absences.save_absence", {
      absence: {
        agent: absenceForm.agent,
        from_date: absenceForm.from_date,
        to_date: absenceForm.to_date,
        note: absenceForm.note,
      },
    });
    showAddAbsence.value = false;
    absenceForm.agent = "";
    absenceForm.from_date = "";
    absenceForm.to_date = "";
    absenceForm.note = "";
    teamAbsences.reload();
    toast.success(__("Absence saved."));
  } catch (e: any) {
    toast.error(e?.messages?.[0] || __("Failed to save absence."));
  } finally {
    savingAbsence.value = false;
  }
}

// Parse routing condition JSON from the policy (may be a JSON string or already an array).
function parseConditionJson(raw: string | any[] | undefined): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

const routingConditionJson = reactive<any[]>(
  parseConditionJson(props.policy.routing_condition_json)
);

const form = reactive({
  enabled: props.policy.enabled ?? 1,
  distribution: props.policy.distribution ?? "Round Robin",
  gate_by_availability: Boolean(props.policy.gate_by_availability ?? 1),
  include_away: Boolean(props.policy.include_away ?? 0),
  assignment_scope: props.policy.assignment_scope ?? "Members and Managers",
  managers: props.policy.managers ? [...props.policy.managers] : [],
  queue_valve_minutes: props.policy.queue_valve_minutes ?? 0,
  overflow_team: props.policy.overflow_team ?? "",
  active_from_time: props.policy.active_from_time?.slice(0, 5) ?? "",
  active_to_time: props.policy.active_to_time?.slice(0, 5) ?? "",
});

const initialSnapshot = ref(
  JSON.stringify({ form: { ...form }, cj: [...routingConditionJson] })
);

// True when a desk-authored python condition exists but json is empty/unparseable.
const isLegacyCondition = computed(
  () => Boolean(props.policy.routing_condition) && routingConditionJson.length === 0
);

const isDirty = computed(() => {
  return (
    JSON.stringify({ form: { ...form }, cj: [...routingConditionJson] }) !==
    initialSnapshot.value
  );
});

const distributionOptions = [
  { label: __("Round Robin"), value: "Round Robin" },
  { label: __("Load Balancing"), value: "Load Balancing" },
  { label: __("Weighted Distribution"), value: "Weighted Distribution" },
];

const scopeOptions = [
  { label: __("Members and Managers"), value: "Members and Managers" },
  { label: __("Members Only"), value: "Members Only" },
];

const hdTeams = createResource({
  url: "frappe.client.get_list",
  params: { doctype: "HD Team", filters: { disabled: 0 }, limit_page_length: 0 },
  auto: true,
});

const overflowTeamOptions = computed(() => [
  { label: __("None — alert managers only"), value: "" },
  ...(hdTeams.data ?? [])
    .filter((t: any) => t.name !== props.policy.team)
    .map((t: any) => ({ label: t.name, value: t.name })),
]);

// Condition builder add-condition dropdown
const conditionDropdownOptions = [
  {
    label: __("Add condition"),
    onClick: () => {
      if (!validateConditions(routingConditionJson)) return;
      routingConditionJson.push("and", ["", "", ""]);
    },
  },
  {
    label: __("Add condition group"),
    onClick: () => {
      routingConditionJson.push("and", [[]]);
    },
  },
];

function goBack() {
  emit("back");
}

async function save() {
  // Validate conditions before saving
  if (
    routingConditionJson.length > 0 &&
    !validateConditions(routingConditionJson)
  ) {
    toast.error(__("Some conditions are incomplete. Please fill in all fields."));
    return;
  }

  saving.value = true;
  try {
    await call("axe_helpdesk.api.team_assignment.save_policy", {
      policy: {
        name: props.policy.name,
        team: props.policy.team,
        enabled: form.enabled ? 1 : 0,
        routing_condition:
          routingConditionJson.length > 0
            ? convertToConditions({
                conditions: routingConditionJson,
                fieldPrefix: "doc",
              })
            : "",
        routing_condition_json: JSON.stringify(routingConditionJson),
        distribution: form.distribution,
        gate_by_availability: form.gate_by_availability ? 1 : 0,
        include_away: form.include_away ? 1 : 0,
        assignment_scope: form.assignment_scope,
        managers: form.managers,
        queue_valve_minutes: Number(form.queue_valve_minutes) || 0,
        overflow_team: form.overflow_team || "",
        active_from_time: form.active_from_time || "",
        active_to_time: form.active_to_time || "",
      },
    });
    toast.success(__("Policy saved."));
    initialSnapshot.value = JSON.stringify({
      form: { ...form },
      cj: [...routingConditionJson],
    });
    emit("back");
  } catch (e: any) {
    const msg = e?.messages?.[0] || __("Failed to save policy.");
    toast.error(msg);
  } finally {
    saving.value = false;
  }
}

// Ensure filterable fields are loaded for CFConditions
if (!filterableFields.fetched) {
  filterableFields.submit();
}

// assignment_policy toggle state — Eligibility controls are inert when off.
const assignmentPolicyOff = ref(false);

// Ensure agents store is populated for the Managers picker (mirrors TeamEdit.vue).
const { agents } = useAgentStore();
onMounted(async () => {
  if (!agents.loading && !agents.data?.length && !agents.list?.promise) {
    agents.fetch();
  }
  try {
    const val = await call("frappe.db.get_single_value", {
      doctype: "Axe Helpdesk Settings",
      field: "enable_assignment_policy",
    });
    assignmentPolicyOff.value = !val;
  } catch {
    // axe_helpdesk absent or endpoint error — assume on (no false alarm).
  }
});
</script>

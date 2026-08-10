<template>
  <Dialog
    :title="isEdit ? __('Edit escalation') : __('Add escalation')"
    :open="open ?? false"
    @update:open="(v: boolean) => (open = v)"
  >
    <template #default>
      <div class="flex flex-col gap-4">
        <FormControl
          :label="__('Name')"
          type="text"
          v-model="form.escalation_name"
          :placeholder="__('e.g. Warn before response breach')"
          :disabled="isEdit"
        />
        <FormControl
          :label="__('Target')"
          type="select"
          v-model="form.target"
          :options="targetOptions"
        />
        <FormControl
          :label="__('Stage')"
          type="select"
          v-model="form.stage"
          :options="stageOptions"
        />
        <FormControl
          v-if="form.stage === 'Pre-breach'"
          :label="__('Threshold (minutes)')"
          type="number"
          v-model="form.threshold_minutes"
          :description="__('Minutes before the deadline')"
        />
        <FormControl
          :label="__('Notify assignee')"
          type="checkbox"
          v-model="form.notify_assignee"
        />
        <FormControl
          :label="__('Notify managers')"
          type="checkbox"
          v-model="form.notify_managers"
          :description="__('Managers configured on the team\'s assignment policy')"
        />
        <FormControl
          :label="__('Bump priority')"
          type="select"
          v-model="form.bump_priority"
          :options="priorityOptions"
        />
        <FormControl
          :label="__('Re-route to overflow team')"
          type="checkbox"
          v-model="form.reassign_overflow"
          :description="__('Uses the overflow team from the team\'s assignment policy; does nothing when none is set')"
        />
        <p v-if="validationError" class="text-p-sm text-ink-red-6">
          {{ validationError }}
        </p>
      </div>
    </template>
    <template #actions>
      <div class="flex gap-2 justify-end">
        <Button variant="subtle" :label="__('Cancel')" @click="open = false" />
        <Button
          variant="solid"
          :label="__('Save')"
          :loading="saving"
          @click="save"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { Button, call, Dialog, FormControl, toast } from "frappe-ui";
import { computed, reactive, ref, watch } from "vue";
import { __ } from "@/translation";
import { useTicketPriorityStore } from "@/stores/ticketPriority";

const props = defineProps<{
  sla: string;
  escalation?: any; // null/undefined = create; object = edit
}>();

const emit = defineEmits<{
  (e: "saved"): void;
}>();

const open = defineModel<boolean>("open");

const priorityStore = useTicketPriorityStore();

const isEdit = computed(() => Boolean(props.escalation?.name));

const targetOptions = [
  { label: __("Response"), value: "Response" },
  { label: __("Resolution"), value: "Resolution" },
];

const stageOptions = [
  { label: __("Pre-breach"), value: "Pre-breach" },
  { label: __("Breach"), value: "Breach" },
];

const priorityOptions = computed(() => [
  { label: __("Don't change"), value: "" },
  ...(priorityStore.priorities.data ?? []).map((p: any) => ({
    label: p.name,
    value: p.name,
  })),
]);

const blankForm = () => ({
  escalation_name: "",
  target: "Response",
  stage: "Pre-breach",
  threshold_minutes: 30,
  notify_assignee: false,
  notify_managers: false,
  bump_priority: "",
  reassign_overflow: false,
});

const form = reactive(blankForm());
const saving = ref(false);
const validationError = ref("");

// Populate when editing, reset when adding
watch(
  () => props.escalation,
  (esc) => {
    if (esc) {
      Object.assign(form, {
        escalation_name: esc.escalation_name ?? "",
        target: esc.target ?? "Response",
        stage: esc.stage ?? "Pre-breach",
        threshold_minutes: esc.threshold_minutes ?? 30,
        notify_assignee: Boolean(esc.notify_assignee),
        notify_managers: Boolean(esc.notify_managers),
        bump_priority: esc.bump_priority ?? "",
        reassign_overflow: Boolean(esc.reassign_overflow),
      });
    } else {
      Object.assign(form, blankForm());
    }
    validationError.value = "";
  },
  { immediate: true }
);

function validate(): boolean {
  if (!form.escalation_name.trim()) {
    validationError.value = __("Name is required.");
    return false;
  }
  if (form.stage === "Pre-breach" && Number(form.threshold_minutes) < 1) {
    validationError.value = __("Threshold must be at least 1 minute.");
    return false;
  }
  validationError.value = "";
  return true;
}

async function save() {
  if (!validate()) return;
  saving.value = true;
  try {
    const payload: any = {
      ...form,
      threshold_minutes: Number(form.threshold_minutes),
      sla: props.sla,
    };
    if (isEdit.value) {
      payload.name = props.escalation.name;
    }
    await call("axe_helpdesk.api.sla_plus.save_escalation", {
      escalation: payload,
    });
    open.value = false;
    emit("saved");
    toast.success(__("Escalation saved."));
  } catch (e: any) {
    toast.error(e?.messages?.[0] || __("Failed to save escalation."));
  } finally {
    saving.value = false;
  }
}
</script>

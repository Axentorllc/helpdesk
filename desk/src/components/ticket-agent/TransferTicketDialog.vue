<template>
  <Dialog :title="__('Transfer ticket')" v-model:open="open">
    <template #default>
      <div class="flex flex-col gap-4">
        <FormControl
          type="select"
          :label="__('Transfer to')"
          v-model="targetType"
          :options="[
            { label: __('Agent'), value: 'agent' },
            { label: __('Team'), value: 'team' },
          ]"
        />
        <FormControl
          v-if="targetType === 'agent'"
          type="select"
          :label="__('Agent')"
          v-model="targetAgent"
          :options="agentOptions"
        />
        <FormControl
          v-else
          type="select"
          :label="__('Team')"
          v-model="targetTeam"
          :options="teamOptions"
        />
        <FormControl
          type="textarea"
          :label="__('Reason')"
          v-model="reason"
          :placeholder="__('Why is this being transferred?')"
        />
        <p v-if="formError" class="text-p-sm text-ink-red-4">{{ formError }}</p>
      </div>
    </template>
    <template #actions>
      <div class="flex gap-2 justify-end">
        <Button variant="subtle" :label="__('Cancel')" @click="open = false" />
        <Button
          variant="solid"
          :label="__('Transfer')"
          :loading="submitting"
          :disabled="!canSubmit"
          @click="submit"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { Button, call, createResource, Dialog, FormControl, toast } from "frappe-ui";
import { computed, onMounted, ref, watch } from "vue";
import { useAgentStore } from "@/stores/agent";
import { __ } from "@/translation";

const props = defineProps<{ ticketName: string }>();
const emit = defineEmits<{ (e: "success"): void }>();

const open = defineModel<boolean>();

const targetType = ref("agent");
const targetAgent = ref("");
const targetTeam = ref("");
const reason = ref("");
const formError = ref("");
const submitting = ref(false);

const { agents } = useAgentStore();

// Ensure agents are loaded when dialog opens.
watch(open, (val) => {
  if (val && !agents.loading && !agents.data?.length) agents.fetch();
});

const agentOptions = computed(() => [
  { label: __("Select agent"), value: "" },
  ...(agents.data ?? []).map((a: any) => ({
    label: a.agent_name,
    value: a.user,
  })),
]);

const hdTeams = createResource({
  url: "frappe.client.get_list",
  params: { doctype: "HD Team", filters: { disabled: 0 }, limit_page_length: 0 },
  auto: true,
});

const teamOptions = computed(() => [
  { label: __("Select team"), value: "" },
  ...(hdTeams.data ?? []).map((t: any) => ({ label: t.name, value: t.name })),
]);

const canSubmit = computed(() =>
  targetType.value === "agent" ? !!targetAgent.value : !!targetTeam.value
);

async function submit() {
  formError.value = "";
  submitting.value = true;
  try {
    await call("axe_helpdesk.api.ticket_actions.transfer", {
      ticket: props.ticketName,
      ...(targetType.value === "agent"
        ? { target_agent: targetAgent.value }
        : { target_team: targetTeam.value }),
      ...(reason.value ? { reason: reason.value } : {}),
    });
    toast.success(__("Ticket transferred."));
    open.value = false;
    emit("success");
  } catch (e: any) {
    toast.error(e?.messages?.[0] || __("Transfer failed."));
  } finally {
    submitting.value = false;
  }
}
</script>

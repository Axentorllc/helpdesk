<template>
  <Dialog
    :title="__('Test rules')"
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <template #default>
      <div class="flex flex-col gap-4">
        <FormControl
          :label="__('Mode')"
          type="select"
          v-model="mode"
          :options="[
            { label: __('Existing ticket'), value: 'ticket' },
            { label: __('Sample values'), value: 'fields' },
          ]"
        />

        <!-- Existing ticket -->
        <FormControl
          v-if="mode === 'ticket'"
          :label="__('Ticket ID')"
          type="text"
          v-model="ticketId"
          :placeholder="__('e.g. HD-0001')"
        />

        <!-- Sample values -->
        <template v-else>
          <FormControl :label="__('Subject')" type="text" v-model="fields.subject" />
          <FormControl
            :label="__('Raised By (email)')"
            type="text"
            v-model="fields.raised_by"
          />
          <FormControl :label="__('Priority')" type="text" v-model="fields.priority" />
          <FormControl
            :label="__('Ticket Type')"
            type="text"
            v-model="fields.ticket_type"
          />
          <FormControl
            :label="__('Via customer portal')"
            type="checkbox"
            v-model="fields.via_customer_portal"
          />
          <p class="text-p-sm text-ink-gray-5 italic">
            {{ __("Fields left empty are evaluated as empty — not as their defaults.") }}
          </p>
        </template>

        <!-- Results -->
        <template v-if="results !== null">
          <!-- Feature-off truth note -->
          <div
            v-if="results.rules_enabled === false"
            class="rounded-md bg-surface-gray-1 border border-outline-gray-2 px-4 py-3"
          >
            <span class="text-p-sm text-ink-gray-6">
              {{
                __(
                  "Ticket rules are currently disabled — this shows what would happen once enabled."
                )
              }}
            </span>
          </div>

          <!-- Empty rules -->
          <p
            v-if="results.results.length === 0"
            class="text-p-sm text-ink-gray-5 text-center py-2"
          >
            {{ __("No rules to evaluate.") }}
          </p>

          <!-- Grouped by event -->
          <template v-else>
            <div
              v-for="group in groupedResults"
              :key="group.event"
              class="flex flex-col gap-1"
            >
              <span class="text-sm text-ink-gray-5">{{ __(group.event) }}</span>
              <div
                v-for="(row, idx) in group.rows"
                :key="idx"
                class="flex flex-col gap-1 rounded-md border border-outline-gray-1 px-3 py-2"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-base-medium text-ink-gray-7">{{ row.rule }}</span>
                  <Badge
                    v-if="row.status === 'matched' && !row.unreachable"
                    :label="__('Would apply')"
                    theme="green"
                    variant="solid"
                  />
                  <Badge
                    v-else-if="row.status === 'matched'"
                    :label="__('Unreachable (after stop)')"
                    theme="gray"
                    variant="subtle"
                  />
                  <Badge
                    v-else-if="row.status === 'no_match'"
                    :label="__('No match')"
                    theme="gray"
                    variant="subtle"
                  />
                  <Badge
                    v-else-if="row.status === 'error'"
                    :label="__('Error')"
                    theme="red"
                    variant="subtle"
                  />
                </div>
                <!-- Would-set fields under a matched row -->
                <div
                  v-if="row.status === 'matched' && row.would_set"
                  class="flex flex-col gap-0.5"
                >
                  <span
                    v-for="(val, field) in row.would_set"
                    :key="field"
                    class="text-xs text-ink-gray-6"
                  >
                    {{ field }} → {{ val }}
                  </span>
                </div>
                <!-- Error detail -->
                <code
                  v-if="row.status === 'error' && row.error"
                  class="text-xs text-ink-red-6 bg-surface-red-1 rounded px-2 py-1 break-all"
                  >{{ row.error }}</code
                >
              </div>
            </div>
          </template>
        </template>
      </div>
    </template>

    <template #actions>
      <div class="flex gap-2 justify-end">
        <Button
          variant="subtle"
          :label="__('Cancel')"
          @click="emit('update:open', false)"
        />
        <Button
          variant="solid"
          :label="__('Run test')"
          :loading="loading"
          :disabled="mode === 'ticket' && !ticketId.trim()"
          @click="runTest"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { Badge, Button, call, Dialog, FormControl, toast } from "frappe-ui";
import { computed, reactive, ref, watch } from "vue";
import { __ } from "@/translation";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{
  (e: "update:open", v: boolean): void;
}>();

// Reset state whenever dialog opens
watch(
  () => props.open,
  (val) => {
    if (val) reset();
  }
);

const mode = ref<"ticket" | "fields">("ticket");
const ticketId = ref("");
const fields = reactive({
  subject: "",
  raised_by: "",
  priority: "",
  ticket_type: "",
  via_customer_portal: false,
});
const loading = ref(false);

type RuleRow = {
  rule: string;
  event: string;
  rule_order: number;
  status: "matched" | "no_match" | "error";
  error: string | null;
  would_set: Record<string, any> | null;
  unreachable: boolean;
};

const results = ref<{
  results: RuleRow[];
  rules_enabled?: boolean;
} | null>(null);

// Group result rows under Creation / Update subheadings, preserving order.
const groupedResults = computed(() => {
  const rows = results.value?.results ?? [];
  return (["Creation", "Update"] as const)
    .map((event) => ({ event, rows: rows.filter((r) => r.event === event) }))
    .filter((g) => g.rows.length > 0);
});

function reset() {
  mode.value = "ticket";
  ticketId.value = "";
  Object.assign(fields, {
    subject: "",
    raised_by: "",
    priority: "",
    ticket_type: "",
    via_customer_portal: false,
  });
  results.value = null;
  loading.value = false;
}

async function runTest() {
  results.value = null;
  loading.value = true;
  try {
    let payload: Record<string, any>;
    if (mode.value === "ticket") {
      payload = { ticket: ticketId.value };
    } else {
      // Only send non-empty string fields; include checkbox only when true
      const f: Record<string, any> = {};
      if (fields.subject) f.subject = fields.subject;
      if (fields.raised_by) f.raised_by = fields.raised_by;
      if (fields.priority) f.priority = fields.priority;
      if (fields.ticket_type) f.ticket_type = fields.ticket_type;
      if (fields.via_customer_portal) f.via_customer_portal = 1;
      payload = { fields: f };
    }
    results.value = await call(
      "axe_helpdesk.api.ticket_rules.simulate",
      payload
    );
  } catch (e: any) {
    toast.error(e?.messages?.[0] || __("Simulation failed."));
  } finally {
    loading.value = false;
  }
}
</script>

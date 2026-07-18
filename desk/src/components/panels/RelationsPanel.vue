<!--
  Generic ticket-relations side-panel renderer. Shows a parent chip (if this
  ticket is a child), a children list with status + SLA agreement_status chip,
  open/blocking counts, and a "+ Create" button that opens a quick-entry dialog
  driven by the "Default" ticket template's custom fields. Fetches from
  panel.api and creates via panel.create_api. Contributed via the
  helpdesk_ticket_panels hook.
-->
<template>
  <div>
    <Section :label="panel.title" v-model:opened="opened">
      <template #header="{ opened, toggle }">
        <div
          class="flex gap-2.5 items-center justify-between sticky top-0 bg-surface-white z-10 px-4 py-4 cursor-pointer"
          @click="toggle"
        >
          <div class="flex items-center gap-2">
            <span class="text-ink-gray-8 font-semibold text-base select-none">
              {{ __(panel.title) }}
            </span>
            <span
              v-if="openChildrenCount > 0"
              class="text-xs text-ink-gray-5"
            >
              {{ openChildrenCount }} open
            </span>
            <span
              v-if="blockingOpenCount > 0"
              class="text-xs text-red-500 font-medium"
            >
              · {{ blockingOpenCount }} blocking
            </span>
          </div>
          <LucideChevronRight
            class="size-4 text-ink-gray-6"
            :class="{ 'rotate-90': opened }"
          />
        </div>
      </template>

      <div class="px-4 pb-4 mt-0.5 space-y-2">
        <!-- Parent chip -->
        <div
          v-if="relations.data?.parent"
          class="-mx-2 px-2 py-2 cursor-pointer rounded hover:bg-surface-gray-2 transition-colors flex items-center gap-2"
          @click="openTicket(relations.data.parent.name)"
        >
          <span class="text-xs text-ink-gray-5 shrink-0">Parent ·</span>
          <span class="text-xs text-ink-gray-9 font-medium truncate">
            #{{ relations.data.parent.name }} {{ relations.data.parent.subject }}
          </span>
          <span
            class="text-xs px-2 py-0.5 font-base shrink-0 rounded-sm ml-auto"
            :class="getStatusColor(relations.data.parent.status)"
          >
            {{ relations.data.parent.status }}
          </span>
        </div>

        <!-- Children list -->
        <ul
          v-if="relations.data?.children?.length"
          class="divide-y divide-outline-gray-1"
        >
          <li
            v-for="child in relations.data.children"
            :key="child.name"
            @click="openTicket(child.name)"
          >
            <div
              class="-mx-2 px-2 py-3 cursor-pointer rounded hover:bg-surface-gray-2 transition-colors"
            >
              <p class="text-sm font-base text-ink-gray-9 truncate mb-2">
                {{ child.subject }}
              </p>
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm text-ink-gray-5 shrink-0">
                  {{ "#" + child.name }}
                </p>
                <div class="flex items-center gap-1.5 shrink-0">
                  <!-- SLA agreement_status chip -->
                  <span
                    v-if="child.agreement_status"
                    class="text-xs px-2 py-0.5 font-base rounded-sm"
                    :class="getSlaColor(child.agreement_status)"
                  >
                    {{ child.agreement_status }}
                  </span>
                  <span
                    class="text-xs px-2 py-0.5 font-base rounded-sm"
                    :class="getStatusColor(child.status)"
                  >
                    {{ child.status }}
                  </span>
                </div>
              </div>
            </div>
          </li>
        </ul>

        <!-- Empty state message (no parent, no children) -->
        <p
          v-if="!relations.data?.parent && !relations.data?.children?.length && !relations.loading"
          class="text-sm text-ink-gray-4"
        >
          {{ __("No related tickets yet.") }}
        </p>

        <!-- Create button -->
        <Button
          v-if="panel.create_api"
          :label="__('＋ Create Subticket')"
          variant="subtle"
          theme="gray"
          class="w-full"
          @click="showDialog = true"
        />
      </div>
    </Section>

    <!-- Create dialog -->
    <Dialog v-if="panel.create_api" v-model:open="showDialog" :title="__('Create Subticket')" size="lg">
      <template #default>
        <div class="space-y-4 pt-2">
          <!-- Subject (required) -->
          <div class="space-y-1.5">
            <span class="block text-sm text-ink-gray-7">
              {{ __("Subject") }}
              <span class="place-self-center text-ink-red-3">*</span>
            </span>
            <FormControl
              v-model="draft.subject"
              type="text"
              :placeholder="__('A short description')"
              maxlength="140"
            />
          </div>

          <!-- Message / first description (required) -->
          <div class="space-y-1.5">
            <span class="block text-sm text-ink-gray-7">
              {{ __("Message") }}
              <span class="place-self-center text-ink-red-3">*</span>
            </span>
            <FormControl
              v-model="draft.description"
              type="textarea"
              :rows="4"
              :placeholder="__('The first message for this subticket')"
            />
          </div>

          <!-- ticket_type (required) -->
          <div class="space-y-1.5">
            <span class="block text-sm text-ink-gray-7">
              {{ __("Ticket Type") }}
              <span class="place-self-center text-ink-red-3">*</span>
            </span>
            <Link
              doctype="HD Ticket Type"
              :placeholder="__('Select ticket type')"
              :modelValue="draft.ticket_type"
              @update:model-value="(v) => (draft.ticket_type = v)"
            />
          </div>

          <!-- priority -->
          <div class="space-y-1.5">
            <span class="block text-sm text-ink-gray-7">
              {{ __("Priority") }}
            </span>
            <Link
              doctype="HD Ticket Priority"
              :placeholder="__('Select priority')"
              :modelValue="draft.priority"
              @update:model-value="(v) => (draft.priority = v)"
            />
          </div>

          <!-- agent_group (team) — defaults to parent's group -->
          <div class="space-y-1.5">
            <span class="block text-sm text-ink-gray-7">
              {{ __("Team") }}
            </span>
            <Link
              doctype="HD Team"
              :placeholder="__('Select team')"
              :modelValue="draft.agent_group"
              @update:model-value="(v) => (draft.agent_group = v)"
            />
          </div>

          <!-- Dynamic type-specific custom fields from the Default template -->
          <!-- parseField(field, draft) evaluates depends_on against draft, so
               fields appear/hide as draft.ticket_type changes. -->
          <template v-if="template.data?.fields?.length">
            <UniInput
              v-for="field in visibleTemplateFields"
              :key="field.fieldname"
              :field="field"
              :value="draft[field.fieldname]"
              @change="(e) => (draft[e.fieldname] = e.value)"
            />
          </template>
        </div>
      </template>
      <template #actions>
        <div class="flex justify-end gap-2">
          <Button
            :label="__('Cancel')"
            variant="subtle"
            theme="gray"
            @click="showDialog = false"
          />
          <Button
            :label="__('Create')"
            variant="solid"
            theme="gray"
            :loading="createRelation.loading"
            @click="submitCreate"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { Link, UniInput } from "@/components";
import { parseField } from "@/composables/formCustomisation";
import { getMeta } from "@/stores/meta";
import { useTicketStatusStore } from "@/stores/ticketStatus";
import { __ } from "@/translation";
import { ActivitiesSymbol, TicketSymbol } from "@/types";
import { PanelManifestEntry } from "@/stores/channels";
import { Button, createResource, Dialog, FormControl, toast } from "frappe-ui";
import { computed, inject, reactive, ref } from "vue";
import LucideChevronRight from "~icons/lucide/chevron-right";
import Section from "../Section.vue";

const props = defineProps<{ panel: PanelManifestEntry }>();

const ticket = inject(TicketSymbol)!;
const ticketId = computed(() => ticket.value?.doc?.name);
const activities = inject(ActivitiesSymbol)!;
const { getStatus, colorMap } = useTicketStatusStore();
const { getField } = getMeta("HD Ticket");

// ── Relations resource ──────────────────────────────────────────────────────
const relations = createResource({
  url: props.panel.api!,
  makeParams: () => ({ ticket: ticketId.value }),
  auto: true,
});

const opened = ref(true);

const openChildrenCount = computed(
  () => relations.data?.open_children_count ?? 0
);
const blockingOpenCount = computed(
  () => relations.data?.blocking_open_count ?? 0
);

// ── Status / SLA colors ─────────────────────────────────────────────────────
function getStatusColor(status: string) {
  const { color } = getStatus(status) ?? {};
  return colorMap[color] ?? colorMap["Default"];
}

// ponytail: SLA chip colors — three known agreement_status values from core SLA.
const slaColorMap: Record<string, string> = {
  Fulfilled: "bg-green-100 text-green-700",
  Failed: "bg-red-100 text-red-700",
  "First Response Due": "bg-yellow-100 text-yellow-700",
};
function getSlaColor(status: string) {
  return slaColorMap[status] ?? "bg-surface-gray-2 text-ink-gray-5";
}

// ── New-tab navigation ──────────────────────────────────────────────────────
function openTicket(name: string) {
  window.open(window.location.origin + "/helpdesk/tickets/" + name, "_blank");
}

// ── Dialog state ────────────────────────────────────────────────────────────
const showDialog = ref(false);

// draft object — ticket_type writes here; visibleTemplateFields re-evaluates
// depends_on against draft so custom fields show/hide dynamically.
const draft = reactive<Record<string, any>>({
  subject: "",
  description: "",
  ticket_type: "",
  priority: "",
  agent_group: ticket.value?.doc?.agent_group ?? "",
});

// ── Template fields (Default template — drives dynamic custom fields) ───────
const template = createResource({
  url: "helpdesk.helpdesk.doctype.hd_ticket_template.api.get_one",
  makeParams: () => ({ name: "Default" }),
  auto: true,
  onSuccess: (data) => {
    // Seed draft keys so depends_on doesn't fail on missing keys, and pre-fill
    // each field from the parent ticket to save the agent re-typing (generic:
    // any template field inherits). Skip read-only/computed fields, and don't
    // clobber core pickers.
    (data.fields ?? []).forEach((f) => {
      if (f.fieldname in draft) return;
      const parentVal = ticket.value?.doc?.[f.fieldname];
      const readOnly = Boolean(getField(f.fieldname)?.read_only);
      draft[f.fieldname] =
        !readOnly && parentVal != null && parentVal !== "" ? parentVal : "";
    });
  },
});

// Core fields we handle with explicit pickers above — exclude from the loop.
const CORE_FIELDS = new Set([
  "subject",
  "description",
  "ticket_type",
  "priority",
  "agent_group",
  "status",
  "customer",
]);

const visibleTemplateFields = computed(() => {
  if (!template.data?.fields) return [];
  return template.data.fields
    .filter((f) => !CORE_FIELDS.has(f.fieldname))
    .map((f) => parseField(f, draft));
});

// ── Create relation ─────────────────────────────────────────────────────────
const createRelation = createResource({
  url: props.panel.create_api ?? undefined,
  onSuccess: (data) => {
    window.open(
      window.location.origin + "/helpdesk/tickets/" + data.name,
      "_blank"
    );
    showDialog.value = false;
    relations.reload();
    activities.value?.reload();
  },
  onError: (err) => {
    toast.error(err.messages?.[0] ?? err.message ?? __("Failed to create subticket"));
  },
});

function submitCreate() {
  if (!draft.subject) {
    toast.error(__("Subject is required"));
    return;
  }
  if (!draft.ticket_type) {
    toast.error(__("Ticket Type is required"));
    return;
  }
  if (!draft.description?.trim()) {
    toast.error(__("Message is required"));
    return;
  }

  // Collect template custom-field values (exclude core fields and empties).
  const templateValues: Record<string, any> = {};
  (template.data?.fields ?? []).forEach((f) => {
    if (!CORE_FIELDS.has(f.fieldname) && draft[f.fieldname] !== "") {
      templateValues[f.fieldname] = draft[f.fieldname];
    }
  });

  createRelation.submit({
    parent: ticketId.value,
    doc: {
      subject: draft.subject,
      // plain-text message → HTML so line breaks survive in the first communication
      description: draft.description.trim().replace(/\n/g, "<br>"),
      ticket_type: draft.ticket_type,
      priority: draft.priority || undefined,
      agent_group: draft.agent_group || undefined,
      ...templateValues,
    },
  });
}
</script>

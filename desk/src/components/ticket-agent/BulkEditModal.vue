<template>
  <Dialog
    v-model="open"
    :options="{
      title: __('Bulk Edit'),
      size: 'md',
    }"
  >
    <template #body-content>
      <div class="flex flex-col gap-4">
        <FormControl
          type="select"
          :label="__('Field')"
          :options="fieldOptions"
          v-model="selectedFieldname"
        />
        <div v-if="selectedField">
          <TicketField
            :key="selectedFieldname"
            :field="selectedField"
            :value="value"
            @change="({ value: v }) => (value = v)"
          />
          <p class="mt-1 text-p-sm text-ink-gray-5">
            {{ __("Leave the value empty to clear the field.") }}
          </p>
        </div>
      </div>
    </template>
    <template #actions>
      <div class="flex items-center justify-end gap-2">
        <Button :label="__('Cancel')" @click="open = false" />
        <Button
          variant="solid"
          :loading="bulkUpdateResource.loading"
          :disabled="!selectedFieldname"
          :label="
            props.selections.size === 1
              ? __('Apply to 1 ticket')
              : __('Apply to {0} tickets', [String(props.selections.size)])
          "
          @click="handleSubmit"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import TicketField from "@/components/TicketField.vue";
import { getMeta } from "@/stores/meta";
import { __ } from "@/translation";
import { Field, FieldValue } from "@/types";
import { createResource, Dialog, FormControl, toast } from "frappe-ui";
import { computed, ref, watch } from "vue";

const open = defineModel<boolean>();

const props = defineProps<{
  selections: Set<string>;
}>();
const emit = defineEmits<{
  (e: "success"): void;
}>();

const SUPPORTED = [
  "Link",
  "Select",
  "Check",
  "Data",
  "Small Text",
  "Text",
  "Long Text",
  "Date",
  "Datetime",
  "Int",
  "Float",
];

const { getFields } = getMeta("HD Ticket");

const editableFields = computed(() =>
  getFields().filter(
    (f: any) =>
      SUPPORTED.includes(f.fieldtype) &&
      !f.read_only &&
      !f.hidden &&
      !f.fieldname.startsWith("_") &&
      !["name", "naming_series"].includes(f.fieldname)
  )
);

const fieldOptions = computed(() => [
  { label: __("Select a field..."), value: "" },
  ...editableFields.value.map((f: any) => ({
    label: __(f.label),
    value: f.fieldname,
  })),
]);

const selectedFieldname = ref("");
const value = ref<FieldValue>("");

// Reset value when field changes
watch(selectedFieldname, () => {
  value.value = "";
});

// Reset on modal open
watch(open, (isOpen) => {
  if (isOpen) {
    selectedFieldname.value = "";
    value.value = "";
  }
});

const selectedField = computed<Field | null>(() => {
  if (!selectedFieldname.value) return null;
  const m = editableFields.value.find(
    (f: any) => f.fieldname === selectedFieldname.value
  );
  if (!m) return null;
  return {
    fieldname: m.fieldname,
    label: m.label,
    fieldtype: m.fieldtype,
    options: m.options || "",
    // ponytail: doctype mirrors options; Link in TicketField reads .options for doctype
    doctype: m.options || "",
    placeholder: m.label,
    readonly: false,
    disabled: false,
    required: 0,
    url_method: "",
  };
});

const bulkUpdateResource = createResource({
  url: "frappe.desk.doctype.bulk_update.bulk_update.submit_cancel_or_update_docs",
});

function handleSubmit() {
  const docnames = Array.from(props.selections);
  if (docnames.length > 500) {
    toast.error(
      __("Cannot bulk update more than {0} tickets at once.", ["500"])
    );
    return;
  }

  bulkUpdateResource.submit(
    {
      doctype: "HD Ticket",
      docnames,
      action: "update",
      data: { [selectedFieldname.value]: value.value ?? "" },
    },
    {
      onSuccess(res: any) {
        // _bulk_action returns the failed docnames as a bare list
        const failed: string[] = Array.isArray(res) ? res : [];
        const n = docnames.length;

        if (n >= 20) {
          toast.success(
            __("Updating {0} tickets in background...", [String(n)])
          );
        } else if (failed.length > 0) {
          toast.error(
            __("Failed to update {0} of {1} tickets", [
              String(failed.length),
              String(n),
            ])
          );
        } else {
          toast.success(__("Updated {0} tickets", [String(n)]));
        }
        open.value = false;
        emit("success");
      },
      onError(err: any) {
        const msg =
          err?.messages?.[0] || __("Failed to apply bulk edit.");
        toast.error(msg);
      },
    }
  );
}
</script>

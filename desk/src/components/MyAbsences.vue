<template>
  <Dialog :title="__('My absences')" :open="open ?? false" @update:open="(v) => (open = v)">
    <template #default>
      <!-- Loading -->
      <div v-if="myAbsences.loading && !myAbsences.data" class="flex items-center justify-center py-4">
        <LoadingIndicator class="w-4" />
      </div>
      <!-- Error -->
      <div v-else-if="myAbsences.error" class="text-p-sm text-ink-gray-5">
        {{ __("Could not load absences.") }}
      </div>
      <div v-else class="flex flex-col gap-4">
        <!-- Rows -->
        <div v-if="!list.length" class="text-p-sm text-ink-gray-5">
          {{ __("No absences planned.") }}
        </div>
        <div v-else class="flex flex-col gap-2">
          <div
            v-for="a in list"
            :key="a.name"
            class="flex items-center justify-between group"
          >
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-base text-ink-gray-7">{{ a.from_date }} → {{ a.to_date }}</span>
              <span v-if="a.note" class="text-p-sm text-ink-gray-5 truncate">{{ a.note }}</span>
            </div>
            <Button
              icon="lucide-trash-2"
              variant="ghost"
              theme="gray"
              class="opacity-0 group-hover:opacity-100 shrink-0"
              @click="askDelete(a)"
            />
          </div>
        </div>

        <hr class="border-outline-gray-2" />

        <!-- Inline add form -->
        <div class="flex flex-col gap-3">
          <span class="text-base-medium text-ink-gray-7">{{ __("Add absence") }}</span>
          <div class="grid grid-cols-2 gap-3">
            <FormControl type="date" :label="__('From')" v-model="addForm.from_date" />
            <FormControl type="date" :label="__('To')" v-model="addForm.to_date" />
          </div>
          <FormControl type="text" :label="__('Note')" v-model="addForm.note" :placeholder="__('Optional')" />
          <p v-if="addError" class="text-p-sm text-ink-red-4">{{ addError }}</p>
          <div class="flex justify-end">
            <Button
              variant="solid"
              :label="__('Add')"
              :loading="adding"
              @click="confirmAdd"
            />
          </div>
        </div>
      </div>
    </template>
  </Dialog>

  <!-- Delete confirm dialog -->
  <Dialog :title="__('Remove absence')" v-model:open="showDeleteDialog">
    <template #default>
      <p class="text-p-base text-ink-gray-7">
        {{ __("Remove this absence? This cannot be undone.") }}
      </p>
    </template>
    <template #actions>
      <div class="flex gap-2 justify-end">
        <Button variant="subtle" :label="__('Cancel')" @click="showDeleteDialog = false" />
        <Button
          theme="red"
          variant="solid"
          :label="__('Remove')"
          :loading="deleting"
          @click="confirmDelete"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { Button, call, createResource, Dialog, FormControl, LoadingIndicator, toast } from "frappe-ui";
import { computed, reactive, ref, watch } from "vue";
import { __ } from "@/translation";

const open = defineModel<boolean>();

const myAbsences = createResource({
  url: "axe_helpdesk.api.absences.my_absences",
  auto: false,
});

// Reload whenever dialog opens
watch(open, (val) => {
  if (val) myAbsences.reload();
});

const list = computed(() => myAbsences.data ?? []);

const addForm = reactive({ from_date: "", to_date: "", note: "" });
const addError = ref("");
const adding = ref(false);

async function confirmAdd() {
  addError.value = "";
  if (!addForm.from_date || !addForm.to_date) {
    addError.value = __("From date and To date are required.");
    return;
  }
  if (addForm.to_date < addForm.from_date) {
    addError.value = __("To date must be on or after From date.");
    return;
  }
  adding.value = true;
  try {
    await call("axe_helpdesk.api.absences.save_my_absence", {
      absence: {
        from_date: addForm.from_date,
        to_date: addForm.to_date,
        note: addForm.note,
      },
    });
    addForm.from_date = "";
    addForm.to_date = "";
    addForm.note = "";
    myAbsences.reload();
    toast.success(__("Absence saved."));
  } catch (e: any) {
    toast.error(e?.messages?.[0] || __("Failed to save absence."));
  } finally {
    adding.value = false;
  }
}

const showDeleteDialog = ref(false);
const deleting = ref(false);
const pendingDelete = ref<any>(null);

function askDelete(a: any) {
  pendingDelete.value = a;
  showDeleteDialog.value = true;
}

async function confirmDelete() {
  if (!pendingDelete.value) return;
  deleting.value = true;
  try {
    await call("axe_helpdesk.api.absences.delete_my_absence", {
      name: pendingDelete.value.name,
    });
    showDeleteDialog.value = false;
    pendingDelete.value = null;
    myAbsences.reload();
  } catch (e: any) {
    toast.error(e?.messages?.[0] || __("Failed to remove absence."));
  } finally {
    deleting.value = false;
  }
}
</script>

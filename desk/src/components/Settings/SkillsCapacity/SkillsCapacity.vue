<template>
  <SettingsLayoutBase>
    <template #title>
      <h1 class="text-lg-semibold text-ink-gray-8">
        {{ __("Skills & Capacity") }}
      </h1>
    </template>
    <template #description>
      <p class="text-p-sm max-w-md text-ink-gray-6">
        {{
          __(
            "Define skills, assign them to agents, and set per-policy routing requirements in Team Assignment."
          )
        }}
      </p>
    </template>
    <template #content>
      <!-- Loading -->
      <div
        v-if="overview.loading && !overview.data"
        class="flex items-center justify-center absolute inset-x-0 top-5.5 bottom-0"
      >
        <LoadingIndicator class="w-4" />
      </div>

      <div v-else>
        <!-- Error -->
        <p v-if="overview.error" class="text-p-sm text-ink-red-6">
          {{ __("Could not load skills.") }}
        </p>

        <div v-else>
          <!-- Skills management -->
          <div>
            <div class="flex flex-col gap-1 mb-4">
              <span class="text-lg-semibold text-ink-gray-8">{{ __("Skills") }}</span>
            </div>

            <!-- Skill chips -->
            <div class="flex flex-wrap gap-2 mb-4">
              <div
                v-for="skill in skills"
                :key="skill"
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-gray-2 text-sm text-ink-gray-7"
              >
                <span>{{ skill }}</span>
                <button
                  class="text-ink-gray-4 hover:text-ink-red-5 leading-none"
                  :aria-label="__('Delete skill {0}', [skill])"
                  @click="askDeleteSkill(skill)"
                >
                  ×
                </button>
              </div>
              <p v-if="!skills.length" class="text-p-sm text-ink-gray-5 italic">
                {{ __("No skills yet — add one below.") }}
              </p>
            </div>

            <!-- Add skill -->
            <div class="flex items-center gap-2 max-w-xs">
              <FormControl
                type="text"
                size="sm"
                variant="subtle"
                :placeholder="__('New skill name')"
                v-model="newSkill"
                @keydown.enter="addSkill"
              />
              <Button
                :label="__('Add')"
                variant="outline"
                :disabled="!newSkill.trim()"
                :loading="addingSkill"
                @click="addSkill"
              />
            </div>
          </div>

          <hr class="my-8" />

          <!-- Agent × skill matrix -->
          <div>
            <div class="flex flex-col gap-1 mb-4">
              <span class="text-lg-semibold text-ink-gray-8">{{ __("Agent skills") }}</span>
            </div>

            <!-- Zero skills -->
            <p v-if="!skills.length" class="text-p-sm text-ink-gray-5 italic">
              {{ __("No skills yet — add one above.") }}
            </p>
            <!-- Zero agents -->
            <p v-else-if="!agents.length" class="text-p-sm text-ink-gray-5 italic">
              {{ __("No agents found.") }}
            </p>

            <div v-else class="overflow-x-auto">
              <table class="text-sm text-ink-gray-7 border-collapse">
                <thead>
                  <tr>
                    <th class="text-left pr-6 pb-2 font-medium text-ink-gray-5 min-w-36">
                      {{ __("Agent") }}
                    </th>
                    <th
                      v-for="skill in skills"
                      :key="skill"
                      class="pb-2 px-3 font-medium text-ink-gray-5 whitespace-nowrap"
                    >
                      {{ skill }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="a in agents"
                    :key="a.agent"
                    class="border-t border-outline-gray-1"
                  >
                    <td class="py-2 pr-6 text-ink-gray-7">{{ a.full_name }}</td>
                    <td
                      v-for="skill in skills"
                      :key="skill"
                      class="py-2 px-3 text-center"
                    >
                      <input
                        type="checkbox"
                        :checked="a.skills.includes(skill)"
                        class="cursor-pointer"
                        @change="(e) => toggleSkill(a, skill, (e.target as HTMLInputElement).checked)"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </template>
  </SettingsLayoutBase>

  <!-- Delete skill confirmation -->
  <Dialog :title="__('Delete skill')" v-model:open="showDeleteDialog">
    <template #default>
      <p class="text-p-base text-ink-gray-7">
        {{
          __('Delete skill "{0}"? This removes it from all agents and cannot be undone.', [
            pendingDeleteSkill,
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
          :loading="deletingSkill"
          @click="confirmDeleteSkill"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import {
  Button,
  call,
  createResource,
  Dialog,
  FormControl,
  LoadingIndicator,
  toast,
} from "frappe-ui";
import { computed, ref } from "vue";
import SettingsLayoutBase from "@/components/layouts/SettingsLayoutBase.vue";
import { __ } from "@/translation";

const overview = createResource({
  url: "axe_helpdesk.api.team_assignment.skills_overview",
  auto: true,
});

const skills = computed<string[]>(() => overview.data?.skills ?? []);
const agents = computed<any[]>(() => overview.data?.agents ?? []);

// Add skill
const newSkill = ref("");
const addingSkill = ref(false);

async function addSkill() {
  const name = newSkill.value.trim();
  if (!name) return;
  addingSkill.value = true;
  try {
    await call("axe_helpdesk.api.team_assignment.save_skill", {
      skill_name: name,
    });
    newSkill.value = "";
    overview.reload();
  } catch (e: any) {
    toast.error(e?.messages?.[0] || __("Failed to add skill."));
  } finally {
    addingSkill.value = false;
  }
}

// Delete skill
const showDeleteDialog = ref(false);
const pendingDeleteSkill = ref("");
const deletingSkill = ref(false);

function askDeleteSkill(skill: string) {
  pendingDeleteSkill.value = skill;
  showDeleteDialog.value = true;
}

async function confirmDeleteSkill() {
  if (!pendingDeleteSkill.value) return;
  deletingSkill.value = true;
  try {
    await call("axe_helpdesk.api.team_assignment.delete_skill", {
      skill_name: pendingDeleteSkill.value,
    });
    showDeleteDialog.value = false;
    pendingDeleteSkill.value = "";
    overview.reload();
  } catch (e: any) {
    toast.error(e?.messages?.[0] || __("Failed to delete skill."));
  } finally {
    deletingSkill.value = false;
  }
}

// Agent × skill toggle (optimistic)
async function toggleSkill(agent: any, skill: string, has: boolean) {
  const idx = agent.skills.indexOf(skill);
  // Optimistic update
  if (has && idx === -1) agent.skills.push(skill);
  else if (!has && idx !== -1) agent.skills.splice(idx, 1);

  try {
    await call("axe_helpdesk.api.team_assignment.set_agent_skill", {
      agent: agent.agent,
      skill,
      has,
    });
  } catch (e: any) {
    // Revert
    const revertIdx = agent.skills.indexOf(skill);
    if (!has && revertIdx === -1) agent.skills.push(skill);
    else if (has && revertIdx !== -1) agent.skills.splice(revertIdx, 1);
    toast.error(e?.messages?.[0] || __("Failed to update skill."));
  }
}
</script>

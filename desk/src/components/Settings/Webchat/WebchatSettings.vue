<template>
  <SettingsLayoutBase>
    <template #title>
      <div class="flex items-center gap-2">
        <h1 class="text-lg-semibold text-ink-gray-8">{{ __("Webchat") }}</h1>
        <UnsavedBadge :show="isDirty" />
      </div>
    </template>
    <template #description>
      <p class="text-p-sm max-w-md text-ink-gray-6">
        {{
          __(
            "Embed a live-chat widget on any website. One account per surface — external portal (verified + enforced), public site, or CRM site."
          )
        }}
      </p>
    </template>
    <template #header-actions>
      <Button
        v-if="isDirty"
        :label="__('Save')"
        theme="gray"
        variant="solid"
        :loading="saving"
        @click="saveAppearance"
      />
    </template>
    <template #content>
      <!-- Loading -->
      <div
        v-if="settings.loading && !settings.data"
        class="flex items-center justify-center absolute inset-x-0 top-5.5 bottom-0"
      >
        <LoadingIndicator class="w-4" />
      </div>

      <!-- Error -->
      <p v-else-if="settings.error" class="text-p-sm text-ink-red-6">
        {{ __("Could not load webchat settings.") }}
      </p>

      <!-- Empty state -->
      <div
        v-else-if="!settings.data || settings.data.length === 0"
        class="flex flex-col items-center justify-center gap-4 py-16 text-center"
      >
        <p class="text-p-base text-ink-gray-6">
          {{ __("No webchat accounts yet.") }}
        </p>
        <Button
          :label="__('Add account')"
          variant="solid"
          @click="showAddDialog = true"
        />
      </div>

      <div v-else class="flex flex-col gap-6">
        <!-- Account bar -->
        <div class="flex items-center justify-between gap-3">
          <FormControl
            v-if="settings.data.length > 1"
            type="select"
            :label="__('Account')"
            :options="accountOptions"
            :model-value="selectedAccount?.name"
            @update:model-value="selectAccount"
            class="w-64"
          />
          <span v-else class="text-base font-medium text-ink-gray-8">{{
            selectedAccount?.label
          }}</span>
          <Button
            :label="__('Add account')"
            variant="subtle"
            icon-left="lucide-plus"
            :class="settings.data.length > 1 ? 'mt-5' : ''"
            @click="showAddDialog = true"
          />
        </div>

        <!-- Tabs -->
        <TabButtons
          v-model="activeTab"
          :options="[
            { label: __('Appearance'), value: 'appearance' },
            { label: __('Install & security'), value: 'install' },
          ]"
        />

        <!-- ══════════════════ APPEARANCE (WYSIWYG) ══════════════════ -->
        <div v-show="activeTab === 'appearance'" class="flex gap-8 items-start">
          <!-- Controls -->
          <div class="flex flex-col gap-6 w-72 shrink-0">
            <!-- Brand color -->
            <div class="flex flex-col gap-2">
              <label class="text-p-sm text-ink-gray-6">{{ __("Brand color") }}</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="c in swatches"
                  :key="c"
                  type="button"
                  class="h-7 w-7 rounded-full border border-outline-gray-2 transition"
                  :class="
                    appearance.primary_color.toLowerCase() === c
                      ? 'ring-2 ring-offset-2 ring-ink-gray-5'
                      : ''
                  "
                  :style="{ background: c }"
                  :aria-label="c"
                  @click="appearance.primary_color = c"
                />
              </div>
              <div class="flex items-center gap-2">
                <input
                  type="color"
                  v-model="appearance.primary_color"
                  class="h-9 w-10 rounded border border-outline-gray-2 cursor-pointer shrink-0"
                  :aria-label="__('Pick color')"
                />
                <FormControl
                  type="text"
                  v-model="appearance.primary_color"
                  class="flex-1"
                  placeholder="#2563eb"
                />
              </div>
            </div>

            <!-- Title -->
            <FormControl
              :label="__('Widget title')"
              type="text"
              v-model="appearance.widget_title"
              :placeholder="__('Chat')"
            />

            <!-- Greeting -->
            <div class="flex flex-col gap-1.5">
              <label class="text-p-sm text-ink-gray-6">{{ __("Greeting message") }}</label>
              <textarea
                v-model="appearance.greeting"
                rows="2"
                class="form-textarea rounded border border-outline-gray-2 p-2 text-p-sm w-full"
                :placeholder="__('Hi! How can we help?')"
              />
            </div>

            <!-- Launcher position (segmented) -->
            <div class="flex flex-col gap-1.5">
              <label class="text-p-sm text-ink-gray-6">{{ __("Launcher position") }}</label>
              <div class="inline-flex rounded-lg bg-surface-gray-2 p-0.5">
                <button
                  v-for="pos in ['Left', 'Right']"
                  :key="pos"
                  type="button"
                  class="flex-1 rounded-md px-3 py-1 text-p-sm transition"
                  :class="
                    appearance.launcher_position === pos
                      ? 'bg-surface-white text-ink-gray-8 shadow-sm'
                      : 'text-ink-gray-6'
                  "
                  @click="appearance.launcher_position = pos"
                >
                  {{ pos === 'Left' ? __('Left') : __('Right') }}
                </button>
              </div>
            </div>

            <!-- Spacing sliders -->
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <label class="text-p-sm text-ink-gray-6">{{ __("Side spacing") }}</label>
                <span class="text-p-xs text-ink-gray-5">{{ appearance.side_spacing }}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="48"
                v-model.number="appearance.side_spacing"
                :style="{ accentColor: appearance.primary_color }"
                class="w-full cursor-pointer"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <label class="text-p-sm text-ink-gray-6">{{ __("Bottom spacing") }}</label>
                <span class="text-p-xs text-ink-gray-5">{{ appearance.bottom_spacing }}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="48"
                v-model.number="appearance.bottom_spacing"
                :style="{ accentColor: appearance.primary_color }"
                class="w-full cursor-pointer"
              />
            </div>

            <!-- Pre-chat / identification -->
            <div class="flex flex-col gap-3 pt-2 border-t border-outline-gray-1">
              <div class="flex flex-col gap-1.5">
                <label class="text-p-sm text-ink-gray-6">{{ __("Pre-chat form") }}</label>
                <FormControl
                  type="select"
                  :options="[
                    { label: __('Off'), value: 'Off' },
                    { label: __('Optional'), value: 'Optional' },
                    { label: __('Required'), value: 'Required' },
                  ]"
                  v-model="appearance.pre_chat"
                />
                <p class="text-p-xs text-ink-gray-5">
                  {{ __("Ask visitors to identify themselves before chatting. A typed email/phone links or creates a Contact (marked unverified).") }}
                </p>
              </div>
              <label
                v-if="appearance.pre_chat !== 'Off'"
                class="flex items-center gap-2 text-p-sm text-ink-gray-7"
              >
                <input type="checkbox" v-model="appearance.pre_chat_collect_email" />
                {{ __("Collect email") }}
              </label>
              <label
                v-if="appearance.pre_chat !== 'Off'"
                class="flex items-center gap-2 text-p-sm text-ink-gray-7"
              >
                <input type="checkbox" v-model="appearance.pre_chat_collect_phone" />
                {{ __("Collect phone") }}
              </label>
            </div>

            <button
              type="button"
              class="text-p-xs text-ink-gray-5 hover:underline self-start"
              @click="resetDefaults"
            >
              {{ __("Reset to defaults") }}
            </button>
          </div>

          <!-- Live preview (sticky) -->
          <div class="flex-1 min-w-0 sticky top-0">
            <div class="flex items-center justify-between mb-3">
              <span class="text-p-sm text-ink-gray-6">{{ __("Live preview") }}</span>
              <TabButtons
                v-model="previewState"
                :options="[
                  { label: __('Closed'), value: 'closed' },
                  { label: __('Open'), value: 'open' },
                ]"
              />
            </div>
            <WidgetPreview :appearance="appearance" :state="previewState" />
          </div>
        </div>

        <!-- ══════════════════ INSTALL & SECURITY ══════════════════ -->
        <div v-show="activeTab === 'install'" class="flex flex-col gap-8">
          <!-- Install -->
          <section class="flex flex-col gap-4">
            <div>
              <h2 class="text-base-semibold text-ink-gray-8">
                {{ __("1. Paste the snippet") }}
              </h2>
              <p class="text-p-sm text-ink-gray-6 mt-1">
                {{
                  __(
                    "Add this to the <head> of every page where the widget should appear. The widget only loads from the origins listed below."
                  )
                }}
              </p>
            </div>

            <div class="relative">
              <pre class="rounded bg-surface-gray-2 p-4 text-p-sm font-mono overflow-x-auto whitespace-pre-wrap break-all">{{ basicSnippet }}</pre>
              <Button
                :label="__('Copy')"
                variant="ghost"
                size="sm"
                class="absolute top-2 right-2"
                @click="copy(basicSnippet)"
              />
            </div>

            <div>
              <button
                class="text-p-sm text-ink-blue-4 hover:underline"
                @click="showIdentitySnippet = !showIdentitySnippet"
              >
                {{ showIdentitySnippet ? __("Hide") : __("Show") }}
                {{ __("async identity (JS API) variant") }}
              </button>
              <div v-if="showIdentitySnippet" class="mt-3 relative">
                <pre class="rounded bg-surface-gray-2 p-4 text-p-sm font-mono overflow-x-auto whitespace-pre-wrap break-all">{{ identitySnippet }}</pre>
                <Button
                  :label="__('Copy')"
                  variant="ghost"
                  size="sm"
                  class="absolute top-2 right-2"
                  @click="copy(identitySnippet)"
                />
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-p-sm text-ink-gray-6">
                {{ __("Allowed origins (one per line)") }}
              </label>
              <textarea
                v-model="originsValue"
                rows="4"
                class="form-textarea rounded border border-outline-gray-2 p-2 text-p-sm font-mono w-full"
                :placeholder="__('https://yoursite.com')"
              />
              <p class="text-p-xs text-ink-gray-5">
                {{
                  __(
                    "The widget will only load on pages served from these origins. The frame-ancestors CSP and Referer checks both use this list."
                  )
                }}
              </p>
              <Button
                :label="__('Save origins')"
                variant="subtle"
                :loading="savingOrigins"
                @click="saveOrigins"
              />
            </div>
          </section>

          <Divider />

          <!-- Security -->
          <section class="flex flex-col gap-4">
            <div>
              <h2 class="text-base-semibold text-ink-gray-8">
                {{ __("2–4. Verified identity (optional)") }}
              </h2>
              <p class="text-p-sm text-ink-gray-6 mt-1">
                {{
                  __(
                    "Skip this block for anonymous / pre-chat flows (public site, CRM site). Enable it for an external logged-in portal so visitors are identified without a Frappe account. Verified identity links chats to the same customer Contact record as WhatsApp — email match first, then phone."
                  )
                }}
              </p>
            </div>

            <!-- Secret status -->
            <div class="flex items-center justify-between">
              <div class="flex flex-col gap-0.5">
                <span class="text-base text-ink-gray-8">{{ __("Verify secret") }}</span>
                <span class="text-p-sm text-ink-gray-6">
                  {{
                    selectedAccount?.secret_set
                      ? __("Set — rotated when compromised.")
                      : __("Not set — required for verified identity.")
                  }}
                </span>
              </div>
              <Button
                :label="selectedAccount?.secret_set ? __('Rotate secret') : __('Generate secret')"
                variant="subtle"
                :loading="rotating"
                @click="rotateSecret"
              />
            </div>

            <!-- One-time plaintext panel -->
            <div
              v-if="revealedSecret"
              class="rounded border border-amber-300 bg-amber-50 p-4 flex flex-col gap-2"
            >
              <p class="text-p-sm text-amber-800 font-medium">
                {{ __("Copy this secret now — it will not be shown again.") }}
              </p>
              <div class="flex items-center gap-2">
                <code class="flex-1 text-p-sm font-mono break-all text-amber-900">{{ revealedSecret }}</code>
                <Button
                  :label="__('Copy')"
                  variant="ghost"
                  size="sm"
                  @click="copy(revealedSecret)"
                />
              </div>
              <button
                class="text-p-xs text-amber-600 hover:underline self-start"
                @click="revealedSecret = null"
              >
                {{ __("Dismiss") }}
              </button>
            </div>

            <!-- Hash code — collapsed by default -->
            <div>
              <button
                class="text-p-sm text-ink-blue-4 hover:underline"
                @click="showHashCode = !showHashCode"
              >
                {{ showHashCode ? __("Hide") : __("Show") }}
                {{ __("server-side hash code (Python / Node)") }}
              </button>
              <div v-if="showHashCode" class="mt-3 flex flex-col gap-2">
                <p class="text-p-sm text-ink-gray-6">
                  {{
                    __(
                      "Return user_hash and exp to the page together — the widget must boot with the exact values you signed. Never compute the hash in the browser."
                    )
                  }}
                </p>
                <div class="relative">
                  <pre class="rounded bg-surface-gray-2 p-4 text-p-sm font-mono overflow-x-auto whitespace-pre-wrap">{{ pythonSample }}</pre>
                  <Button :label="__('Copy')" variant="ghost" size="sm" class="absolute top-2 right-2" @click="copy(pythonSample)" />
                </div>
                <div class="relative">
                  <pre class="rounded bg-surface-gray-2 p-4 text-p-sm font-mono overflow-x-auto whitespace-pre-wrap">{{ nodeSample }}</pre>
                  <Button :label="__('Copy')" variant="ghost" size="sm" class="absolute top-2 right-2" @click="copy(nodeSample)" />
                </div>
                <p class="text-p-sm text-ink-gray-6 mt-1">
                  {{ __("Then boot the widget with the signed values (after your async login resolves; end users need no account on this site):") }}
                </p>
                <div class="relative">
                  <pre class="rounded bg-surface-gray-2 p-4 text-p-sm font-mono overflow-x-auto whitespace-pre-wrap">{{ bootSample }}</pre>
                  <Button :label="__('Copy')" variant="ghost" size="sm" class="absolute top-2 right-2" @click="copy(bootSample)" />
                </div>
              </div>
            </div>

            <!-- Enforce -->
            <div class="flex items-center justify-between py-3 border-t border-outline-gray-1">
              <div class="flex flex-col gap-0.5">
                <span class="text-base text-ink-gray-8">{{ __("Enforce verified identity") }}</span>
                <span class="text-p-sm text-ink-gray-6">
                  {{
                    __(
                      "Reject any bootstrap that presents a user_id or user_hash but fails HMAC verification. Anonymous visitors are unaffected. Enable only after verifying that your server-side hash computation works."
                    )
                  }}
                </span>
              </div>
              <Switch
                size="sm"
                :model-value="Boolean(selectedAccount?.enforce)"
                :disabled="!selectedAccount?.secret_set"
                @update:model-value="toggleEnforce"
              />
            </div>
          </section>
        </div>
      </div>
    </template>
  </SettingsLayoutBase>

  <!-- Add account dialog -->
  <Dialog
    v-model:open="showAddDialog"
    :title="__('Add webchat account')"
    :actions="[
      {
        label: __('Create'),
        variant: 'solid',
        loading: creating,
        onClick: createAccount,
      },
    ]"
  >
    <template #default>
      <form class="space-y-3" @submit.prevent="createAccount">
        <FormControl
          v-model="newAccount.label"
          :label="__('Label')"
          :placeholder="__('Customer portal')"
          type="text"
        />
        <div class="flex flex-col gap-1.5">
          <label class="text-p-sm text-ink-gray-6">
            {{ __("Allowed origins (one per line)") }}
          </label>
          <textarea
            v-model="newAccount.allowed_origins"
            rows="3"
            class="form-textarea rounded border border-outline-gray-2 p-2 text-p-sm font-mono w-full"
            :placeholder="__('https://yoursite.com')"
          />
        </div>
      </form>
    </template>
  </Dialog>

  <!-- Rotate confirm dialog -->
  <Dialog
    v-model:open="showRotateConfirm"
    :title="__('Rotate verify secret?')"
    :actions="[
      {
        label: __('Rotate'),
        variant: 'solid',
        theme: 'red',
        onClick: confirmRotate,
      },
    ]"
  >
    <template #default>
      <p class="text-p-sm text-ink-gray-6">
        {{
          __(
            "This invalidates all existing verified sessions immediately. Clients using the old secret will fall back to anonymous (or be rejected if enforcement is on) until you deploy the new secret."
          )
        }}
      </p>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  Button,
  Divider,
  Dialog,
  FormControl,
  LoadingIndicator,
  Switch,
  TabButtons,
  call,
  createResource,
  toast,
} from "frappe-ui";
import SettingsLayoutBase from "@/components/layouts/SettingsLayoutBase.vue";
import UnsavedBadge from "@/components/UnsavedBadge.vue";
import WidgetPreview from "./WidgetPreview.vue";
import { __ } from "@/translation";
import { copyToClipboard } from "@/utils";

// ── Tabs / preview UI state (presentational only) ──────────────────────────────
const activeTab = ref("appearance");
const previewState = ref<"closed" | "open">("open");
const showHashCode = ref(false);
const swatches = ["#2563eb", "#16a34a", "#db2777", "#ea580c", "#7c3aed", "#0891b2"];

// ── Resource ─────────────────────────────────────────────────────────────────
const settings = createResource({
  url: "axon_helpdesk.api_webchat.get_webchat_settings",
  method: "POST", // ponytail: POST required — frappe-ui GET-only trap
  auto: true,
});

// ── Account selection ─────────────────────────────────────────────────────────
const selectedName = ref<string | null>(null);

const selectedAccount = computed(
  () =>
    (settings.data ?? []).find((a: any) => a.name === selectedName.value) ??
    (settings.data ?? [])[0] ??
    null
);

const accountOptions = computed(() =>
  (settings.data ?? []).map((a: any) => ({ label: a.label, value: a.name }))
);

watch(
  () => settings.data,
  (data) => {
    if (data?.length && !selectedName.value) {
      selectedName.value = data[0].name;
    }
  }
);

function selectAccount(name: string) {
  selectedName.value = name;
  revealedSecret.value = null;
  syncAppearanceFromAccount();
}

// ── Origins ───────────────────────────────────────────────────────────────────
const originsValue = ref("");
const savingOrigins = ref(false);

watch(
  selectedAccount,
  (a) => {
    originsValue.value = a?.allowed_origins ?? "";
  },
  { immediate: true }
);

async function saveOrigins() {
  if (!selectedAccount.value) return;
  savingOrigins.value = true;
  try {
    await call("axon_helpdesk.api_webchat.update_origins", {
      account: selectedAccount.value.name,
      allowed_origins: originsValue.value,
    });
    await settings.reload();
    toast.success(__("Origins saved."));
  } catch (e: any) {
    toast.error(e?.messages?.[0] || __("Failed to save origins."));
  } finally {
    savingOrigins.value = false;
  }
}

// ── Snippets ──────────────────────────────────────────────────────────────────
const showIdentitySnippet = ref(false);

const siteOrigin = window.location.origin;

const basicSnippet = computed(() =>
  selectedAccount.value
    ? `<script src="${siteOrigin}/webchat/widget.js" data-widget-key="${selectedAccount.value.widget_key}"><\/script>`
    : ""
);

const identitySnippet = computed(() =>
  selectedAccount.value
    ? `<script>window.axw = window.axw || function(){(axw.q=axw.q||[]).push([].slice.call(arguments))};<\/script>
<script src="${siteOrigin}/webchat/widget.js" data-widget-key="${selectedAccount.value.widget_key}"><\/script>
<script>
  // Call after your async login resolves. user_hash AND exp come from your
  // server together — exp must be the exact value your server signed.
  axw('boot', {
    user_id: session.user_id,
    user_hash: session.chat_hash,  // HMAC-SHA256 computed server-side
    email: session.email,
    phone: session.phone,          // optional
    name: session.display_name,
    exp: session.chat_hash_exp,    // optional; signed server-side with the hash
  });
<\/script>`
    : ""
);

const pythonSample = `import hmac, hashlib, time
exp = str(int(time.time()) + 3600)  # or "" to skip expiry
user_hash = hmac.new(SECRET.encode(), f"{user_id}\\n{email or ''}\\n{phone or ''}\\n{exp}".encode(), hashlib.sha256).hexdigest()`;

const nodeSample = `const crypto = require('crypto');
const exp = String(Math.floor(Date.now() / 1000) + 3600); // or '' to skip expiry
const user_hash = crypto.createHmac('sha256', SECRET).update([user_id, email || '', phone || '', exp].join('\\n')).digest('hex');`;

const bootSample = `axw('boot', {
  user_id: '123',
  user_hash: server.user_hash,  // from your server
  email: 'user@example.com',
  phone: '+201001234567',       // optional
  name: 'Jane Smith',
  exp: server.exp,              // the exact exp your server signed (omit if unsigned)
});`;

async function copy(text: string) {
  await copyToClipboard(text);
  toast.success(__("Copied."));
}

// ── Secret / enforce ──────────────────────────────────────────────────────────
const rotating = ref(false);
const revealedSecret = ref<string | null>(null);
const showRotateConfirm = ref(false);

function rotateSecret() {
  if (selectedAccount.value?.secret_set) {
    showRotateConfirm.value = true;
  } else {
    doRotate();
  }
}

async function confirmRotate() {
  showRotateConfirm.value = false;
  await doRotate();
}

async function doRotate() {
  if (!selectedAccount.value) return;
  rotating.value = true;
  try {
    const result = await call("axon_helpdesk.api_webchat.rotate_verify_secret", {
      account: selectedAccount.value.name,
    });
    revealedSecret.value = result.secret;
    await settings.reload();
    toast.success(__("Secret generated. Copy it now."));
  } catch (e: any) {
    toast.error(e?.messages?.[0] || __("Failed to rotate secret."));
  } finally {
    rotating.value = false;
  }
}

async function toggleEnforce(val: boolean) {
  if (!selectedAccount.value) return;
  const prev = selectedAccount.value.enforce;
  selectedAccount.value.enforce = val; // optimistic
  try {
    await call("axon_helpdesk.api_webchat.set_enforce", {
      account: selectedAccount.value.name,
      enabled: val ? 1 : 0,
    });
    await settings.reload();
  } catch (e: any) {
    selectedAccount.value.enforce = prev; // revert
    toast.error(e?.messages?.[0] || __("Failed to update enforcement."));
  }
}

// ── Appearance ────────────────────────────────────────────────────────────────
const APPEARANCE_DEFAULTS = {
  widget_title: "Chat",
  primary_color: "#2563eb",
  greeting: "",
  launcher_position: "Right",
  side_spacing: 20,
  bottom_spacing: 20,
  pre_chat: "Optional",
  pre_chat_collect_email: true,
  pre_chat_collect_phone: false,
};

const appearance = ref({ ...APPEARANCE_DEFAULTS, widget_title: "" });
const appearanceOriginal = ref({ ...appearance.value });
const saving = ref(false);

const isDirty = computed(
  () => JSON.stringify(appearance.value) !== JSON.stringify(appearanceOriginal.value)
);

function syncAppearanceFromAccount() {
  const a = selectedAccount.value;
  if (!a) return;
  const snap = {
    widget_title: a.widget_title ?? "",
    primary_color: a.primary_color ?? "#2563eb",
    greeting: a.greeting ?? "",
    launcher_position: a.launcher_position ?? "Right",
    side_spacing: a.side_spacing ?? 20,
    bottom_spacing: a.bottom_spacing ?? 20,
    pre_chat: a.pre_chat ?? "Optional",
    pre_chat_collect_email: a.pre_chat_collect_email ?? true,
    pre_chat_collect_phone: a.pre_chat_collect_phone ?? false,
  };
  appearance.value = { ...snap };
  appearanceOriginal.value = { ...snap };
}

watch(selectedAccount, syncAppearanceFromAccount, { immediate: true });

// Reset the live form to widget defaults (dirty-tracked; does not auto-save).
function resetDefaults() {
  appearance.value = { ...APPEARANCE_DEFAULTS };
}

async function saveAppearance() {
  if (!selectedAccount.value) return;
  saving.value = true;
  try {
    await call("axon_helpdesk.api_webchat.update_appearance", {
      account: selectedAccount.value.name,
      ...appearance.value,
    });
    await settings.reload();
    appearanceOriginal.value = { ...appearance.value };
    toast.success(__("Appearance saved."));
  } catch (e: any) {
    toast.error(e?.messages?.[0] || __("Failed to save appearance."));
  } finally {
    saving.value = false;
  }
}

// ── Create account ────────────────────────────────────────────────────────────
const showAddDialog = ref(false);
const creating = ref(false);
const newAccount = ref({ label: "", allowed_origins: "" });

async function createAccount() {
  if (!newAccount.value.label) {
    toast.error(__("Label is required."));
    return;
  }
  creating.value = true;
  try {
    const created = await call("axon_helpdesk.api_webchat.create_webchat_account", {
      label: newAccount.value.label,
      allowed_origins: newAccount.value.allowed_origins,
    });
    await settings.reload();
    selectedName.value = created.name;
    showAddDialog.value = false;
    newAccount.value = { label: "", allowed_origins: "" };
    toast.success(__("Account created."));
  } catch (e: any) {
    toast.error(e?.messages?.[0] || __("Failed to create account."));
  } finally {
    creating.value = false;
  }
}
</script>

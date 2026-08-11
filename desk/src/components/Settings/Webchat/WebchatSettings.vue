<template>
  <SettingsLayoutBase>
    <template #title>
      <h1 class="text-lg-semibold text-ink-gray-8">
        {{ __("Webchat") }}
      </h1>
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

      <div v-else class="flex flex-col gap-8">
        <!-- Account selector (only when >1 account) -->
        <div v-if="settings.data.length > 1" class="flex items-center gap-3">
          <FormControl
            type="select"
            :label="__('Account')"
            :options="accountOptions"
            :model-value="selectedAccount?.name"
            @update:model-value="selectAccount"
            class="w-64"
          />
          <Button
            :label="__('Add account')"
            variant="subtle"
            icon-left="lucide-plus"
            class="mt-5"
            @click="showAddDialog = true"
          />
        </div>
        <div v-else class="flex items-center justify-between">
          <span class="text-base text-ink-gray-7">{{ selectedAccount?.label }}</span>
          <Button
            :label="__('Add account')"
            variant="subtle"
            icon-left="lucide-plus"
            @click="showAddDialog = true"
          />
        </div>

        <Divider />

        <!-- STEP 1 — Installation -->
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

          <!-- Basic snippet -->
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

          <!-- Collapsible: with async identity -->
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

          <!-- Allowed origins editor -->
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

        <!-- STEP 2–4 — Verified Identity -->
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

          <!-- Step 2: compute hash server-side -->
          <div class="flex flex-col gap-2">
            <h3 class="text-base text-ink-gray-8">{{ __("2. Compute the hash server-side") }}</h3>
            <p class="text-p-sm text-ink-gray-6">
              {{
                __(
                  "Sign the canonical 4-field message with HMAC-SHA256. Use empty strings for omitted fields. Never compute the hash client-side — that exposes the secret."
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
          </div>

          <!-- Step 3: boot with identity -->
          <div class="flex flex-col gap-2">
            <h3 class="text-base text-ink-gray-8">{{ __("3. Boot the widget with identity") }}</h3>
            <p class="text-p-sm text-ink-gray-6">
              {{ __("Call axw('boot', …) once after your async login resolves.") }}
              {{ __("End users need no account on this site.") }}
            </p>
            <div class="relative">
              <pre class="rounded bg-surface-gray-2 p-4 text-p-sm font-mono overflow-x-auto whitespace-pre-wrap">{{ bootSample }}</pre>
              <Button :label="__('Copy')" variant="ghost" size="sm" class="absolute top-2 right-2" @click="copy(bootSample)" />
            </div>
          </div>

          <!-- Step 4: enforce -->
          <div class="flex items-center justify-between py-3 border-t border-outline-gray-1">
            <div class="flex flex-col gap-0.5">
              <span class="text-base text-ink-gray-8">{{ __("4. Enforce verified identity") }}</span>
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

        <Divider />

        <!-- Appearance -->
        <section class="flex flex-col gap-4">
          <h2 class="text-base-semibold text-ink-gray-8">{{ __("Appearance") }}</h2>
          <div class="grid grid-cols-2 gap-4">
            <FormControl
              :label="__('Widget title')"
              type="text"
              v-model="appearance.widget_title"
              :placeholder="__('Chat')"
            />
            <div class="flex flex-col gap-1.5">
              <label class="text-p-sm text-ink-gray-6">{{ __("Primary color") }}</label>
              <input
                type="color"
                v-model="appearance.primary_color"
                class="h-9 w-full rounded border border-outline-gray-2 cursor-pointer"
              />
            </div>
            <FormControl
              :label="__('Greeting message')"
              type="text"
              v-model="appearance.greeting"
              :placeholder="__('Hi! How can we help?')"
            />
            <FormControl
              type="select"
              :label="__('Launcher position')"
              :options="[{ label: __('Right'), value: 'Right' }, { label: __('Left'), value: 'Left' }]"
              v-model="appearance.launcher_position"
            />
            <FormControl
              :label="__('Side spacing (px)')"
              type="number"
              v-model="appearance.side_spacing"
            />
            <FormControl
              :label="__('Bottom spacing (px)')"
              type="number"
              v-model="appearance.bottom_spacing"
            />
          </div>
        </section>
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
  call,
  createResource,
  toast,
} from "frappe-ui";
import SettingsLayoutBase from "@/components/layouts/SettingsLayoutBase.vue";
import { __ } from "@/translation";
import { copyToClipboard } from "@/utils";

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

SECRET = "your_verify_secret"
exp = str(int(time.time()) + 3600)  # optional 1-hour expiry; omit -> ""
msg = user_id + "\\n" + (email or "") + "\\n" + (phone or "") + "\\n" + exp
user_hash = hmac.new(SECRET.encode(), msg.encode(), hashlib.sha256).hexdigest()
# Return BOTH to the page: {"user_hash": user_hash, "exp": exp}`;

const nodeSample = `const crypto = require('crypto');

const SECRET = 'your_verify_secret';
const exp = String(Math.floor(Date.now() / 1000) + 3600); // optional; omit -> ''
const msg = [user_id, email || '', phone || '', exp].join('\\n');
const user_hash = crypto.createHmac('sha256', SECRET).update(msg).digest('hex');
// Return BOTH to the page: { user_hash, exp }`;

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
const appearance = ref({
  widget_title: "",
  primary_color: "#2563eb",
  greeting: "",
  launcher_position: "Right",
  side_spacing: 20,
  bottom_spacing: 20,
});
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
  };
  appearance.value = { ...snap };
  appearanceOriginal.value = { ...snap };
}

watch(selectedAccount, syncAppearanceFromAccount, { immediate: true });

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

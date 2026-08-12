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
            :key="acctSelectNonce"
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
              <div
                class="inline-flex rounded-lg bg-surface-gray-2 p-0.5"
                role="radiogroup"
                :aria-label="__('Launcher position')"
              >
                <button
                  v-for="pos in ['Left', 'Right']"
                  :key="pos"
                  type="button"
                  role="radio"
                  :aria-checked="appearance.launcher_position === pos"
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
              <div
                v-if="appearance.pre_chat !== 'Off'"
                class="flex items-center justify-between text-p-sm text-ink-gray-7"
              >
                {{ __("Collect email") }}
                <Switch
                  size="sm"
                  :model-value="Boolean(appearance.pre_chat_collect_email)"
                  @update:model-value="(v) => (appearance.pre_chat_collect_email = v)"
                />
              </div>
              <div
                v-if="appearance.pre_chat !== 'Off'"
                class="flex items-center justify-between text-p-sm text-ink-gray-7"
              >
                {{ __("Collect phone") }}
                <Switch
                  size="sm"
                  :model-value="Boolean(appearance.pre_chat_collect_phone)"
                  @update:model-value="(v) => (appearance.pre_chat_collect_phone = v)"
                />
              </div>
            </div>

            <!-- Home background color + gradient -->
            <div class="flex flex-col gap-2 pt-2 border-t border-outline-gray-1">
              <label class="text-p-sm text-ink-gray-6">{{ __("Home background color") }}</label>
              <div class="flex items-center gap-2">
                <input
                  type="color"
                  v-model="appearance.home_background_color"
                  class="h-9 w-10 rounded border border-outline-gray-2 cursor-pointer shrink-0"
                  :aria-label="__('Pick home background color')"
                />
                <FormControl
                  type="text"
                  v-model="appearance.home_background_color"
                  class="flex-1"
                  placeholder="#1e3a5f"
                />
              </div>
              <label class="text-p-sm text-ink-gray-6">{{ __("Gradient end color") }}</label>
              <div class="flex items-center gap-2">
                <input
                  type="color"
                  v-model="appearance.home_background_gradient_color"
                  class="h-9 w-10 rounded border border-outline-gray-2 cursor-pointer shrink-0"
                  :aria-label="__('Pick gradient end color')"
                />
                <FormControl
                  type="text"
                  v-model="appearance.home_background_gradient_color"
                  class="flex-1"
                  placeholder="#2563eb"
                />
                <button
                  v-if="appearance.home_background_gradient_color"
                  type="button"
                  class="text-p-xs text-ink-gray-5 hover:underline shrink-0"
                  @click="appearance.home_background_gradient_color = ''"
                >
                  {{ __("Clear / solid") }}
                </button>
              </div>
            </div>

            <!-- Header text color (segmented) -->
            <div class="flex flex-col gap-1.5">
              <label class="text-p-sm text-ink-gray-6">{{ __("Header text color") }}</label>
              <div
                class="inline-flex rounded-lg bg-surface-gray-2 p-0.5"
                role="radiogroup"
                :aria-label="__('Header text color')"
              >
                <button
                  v-for="col in ['White', 'Black']"
                  :key="col"
                  type="button"
                  role="radio"
                  :aria-checked="appearance.header_text_color === col"
                  class="flex-1 rounded-md px-3 py-1 text-p-sm transition"
                  :class="
                    appearance.header_text_color === col
                      ? 'bg-surface-white text-ink-gray-8 shadow-sm'
                      : 'text-ink-gray-6'
                  "
                  @click="appearance.header_text_color = col"
                >
                  {{ col === 'White' ? __('White') : __('Black') }}
                </button>
              </div>
            </div>

            <!-- Tagline -->
            <FormControl
              :label="__('Tagline')"
              type="text"
              v-model="appearance.tagline"
              :placeholder="__('Typically replies in a few minutes')"
            />

            <!-- Reply expectation text -->
            <FormControl
              :label="__('Reply time text')"
              type="text"
              v-model="appearance.reply_expectation_text"
              :placeholder="__('We usually reply in a few minutes')"
            />

            <!-- Logo + teammate avatars -->
            <div class="flex flex-col gap-3 pt-2 border-t border-outline-gray-1">
              <label class="text-p-sm text-ink-gray-6">{{ __("Logo & avatars") }}</label>
              <div
                v-for="uploader in imageUploaders"
                :key="uploader.key"
                class="flex items-center gap-3"
              >
                <img
                  v-if="appearance[uploader.key]"
                  :src="appearance[uploader.key]"
                  class="h-9 w-9 rounded object-cover border border-outline-gray-2 shrink-0"
                  :alt="uploader.label"
                />
                <div
                  v-else
                  class="h-9 w-9 rounded border border-outline-gray-2 bg-surface-gray-2 shrink-0"
                />
                <span class="text-p-sm text-ink-gray-7 flex-1">{{ uploader.label }}</span>
                <FileUploader
                  :fileTypes="['image/*']"
                  :uploadArgs="{ private: false }"
                  @success="(file) => (appearance[uploader.key] = file.file_url)"
                >
                  <template #default="{ openFileSelector, uploading }">
                    <Button
                      :label="uploading ? __('Uploading…') : appearance[uploader.key] ? __('Change') : __('Upload')"
                      variant="subtle"
                      size="sm"
                      :loading="uploading"
                      @click="openFileSelector"
                    />
                  </template>
                </FileUploader>
                <button
                  v-if="appearance[uploader.key]"
                  type="button"
                  class="text-p-xs text-ink-gray-5 hover:underline shrink-0"
                  @click="appearance[uploader.key] = ''"
                >
                  {{ __("Remove") }}
                </button>
              </div>
            </div>

            <!-- Toggles: sound, help space, read receipts -->
            <div class="flex flex-col gap-0 pt-2 border-t border-outline-gray-1">
              <div class="flex items-center justify-between py-3">
                <div class="flex flex-col gap-0.5">
                  <span class="text-base text-ink-gray-8">{{ __("Sound alerts") }}</span>
                  <span class="text-p-sm text-ink-gray-6">{{ __("Play a chime when a new message arrives while the widget is closed.") }}</span>
                </div>
                <Switch
                  size="sm"
                  :model-value="Boolean(appearance.sound_enabled)"
                  @update:model-value="(v) => (appearance.sound_enabled = v ? 1 : 0)"
                />
              </div>
              <div class="flex items-center justify-between py-3 border-t border-outline-gray-1">
                <div class="flex flex-col gap-0.5">
                  <span class="text-base text-ink-gray-8">{{ __("Help space") }}</span>
                  <span class="text-p-sm text-ink-gray-6">{{ __("Show a Help tab in the widget so visitors can search your knowledge base.") }}</span>
                </div>
                <Switch
                  size="sm"
                  :model-value="Boolean(appearance.enable_help_space)"
                  @update:model-value="(v) => (appearance.enable_help_space = v ? 1 : 0)"
                />
              </div>
              <div class="flex items-center justify-between py-3 border-t border-outline-gray-1">
                <div class="flex flex-col gap-0.5">
                  <span class="text-base text-ink-gray-8">{{ __("Show agent read receipts") }}</span>
                  <span class="text-p-sm text-ink-gray-6">{{ __('Display a "Seen" indicator to visitors when your team has read their message.') }}</span>
                </div>
                <Switch
                  size="sm"
                  :model-value="Boolean(appearance.show_agent_read_receipts)"
                  @update:model-value="(v) => (appearance.show_agent_read_receipts = v ? 1 : 0)"
                />
              </div>
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
                  { label: __('Home'), value: 'home' },
                  { label: __('Chat'), value: 'chat' },
                  { label: __('Closed'), value: 'closed' },
                ]"
              />
            </div>
            <WidgetPreview :appearance="appearance" :state="previewState" />
          </div>
        </div>

        <!-- ══════════════════ INSTALL & SECURITY ══════════════════ -->
        <div v-show="activeTab === 'install'" class="flex flex-col gap-8">
          <!-- ── Step 1: Paste the embed snippet ── -->
          <section class="flex flex-col gap-4">
            <div>
              <h2 class="text-base-semibold text-ink-gray-8">
                {{ __("1. Paste the embed snippet") }}
              </h2>
              <p class="text-p-sm text-ink-gray-6 mt-1">
                {{
                  __(
                    "Add this to the <head> of every page where the widget should appear. This alone enables anonymous / pre-chat chat. For verified identity (external logged-in portals), continue with steps 2–6."
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

            <!-- Security: allowed origins -->
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

          <!-- Verified identity intro -->
          <p class="text-p-sm text-ink-gray-6 -mb-2">
            {{
              __(
                "Steps 2–6 add verified identity — skip them for anonymous / pre-chat flows (public site, CRM site). Enable it for an external logged-in portal so visitors are identified without a Frappe account. Verified identity links chats to the same customer Contact record as WhatsApp — email match first, then phone."
              )
            }}
          </p>

          <!-- ── Step 2: Generate the identity-verification secret ── -->
          <section class="flex flex-col gap-4">
            <div>
              <h2 class="text-base-semibold text-ink-gray-8">
                {{ __("2. Generate your identity-verification secret") }}
              </h2>
              <p class="text-p-sm text-ink-gray-6 mt-1">
                {{ __("A shared secret your server uses to sign each visitor's identity. Rotate it if it is ever compromised.") }}
              </p>
            </div>

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
            <p class="text-p-xs text-ink-gray-5">
              {{ __("Store this as your SECRET (an env var); the code samples in step 3 reference it.") }}
            </p>
          </section>

          <Divider />

          <!-- ── Step 3: Sign the identity server-side ── -->
          <section class="flex flex-col gap-4">
            <div>
              <h2 class="text-base-semibold text-ink-gray-8">
                {{ __("3. Sign the identity server-side") }}
              </h2>
              <p class="text-p-sm text-ink-gray-6 mt-1">
                {{
                  __(
                    "Compute user_hash on your server from the signed-in user's details. Never compute the hash in the browser — it would leak your secret."
                  )
                }}
              </p>
            </div>
            <div>
              <button
                class="text-p-sm text-ink-gray-9 hover:underline"
                @click="showHashCode = !showHashCode"
              >
                {{ showHashCode ? __("Hide") : __("Show") }}
                {{ __("server-side hash code (Python / Node)") }}
              </button>
              <div v-if="showHashCode" class="mt-3 flex flex-col gap-2">
                <div class="relative">
                  <pre class="rounded bg-surface-gray-2 p-4 text-p-sm font-mono overflow-x-auto whitespace-pre-wrap">{{ pythonSample }}</pre>
                  <Button :label="__('Copy')" variant="ghost" size="sm" class="absolute top-2 right-2" @click="copy(pythonSample)" />
                </div>
                <div class="relative">
                  <pre class="rounded bg-surface-gray-2 p-4 text-p-sm font-mono overflow-x-auto whitespace-pre-wrap">{{ nodeSample }}</pre>
                  <Button :label="__('Copy')" variant="ghost" size="sm" class="absolute top-2 right-2" @click="copy(nodeSample)" />
                </div>
              </div>
            </div>
          </section>

          <Divider />

          <!-- ── Step 4: Boot the widget with the signed values ── -->
          <section class="flex flex-col gap-4">
            <div>
              <h2 class="text-base-semibold text-ink-gray-8">
                {{ __("4. Boot the widget with the signed values") }}
              </h2>
              <p class="text-p-sm text-ink-gray-6 mt-1">
                {{
                  __(
                    "After your async login resolves, boot the widget with the exact user_hash and exp your server signed (end users need no account on this site)."
                  )
                }}
              </p>
            </div>
            <div class="relative">
              <pre class="rounded bg-surface-gray-2 p-4 text-p-sm font-mono overflow-x-auto whitespace-pre-wrap">{{ bootSample }}</pre>
              <Button :label="__('Copy')" variant="ghost" size="sm" class="absolute top-2 right-2" @click="copy(bootSample)" />
            </div>
          </section>

          <Divider />

          <!-- ── Step 5: Verify your integration ── -->
          <section class="flex flex-col gap-4">
            <div>
              <h2 class="text-base-semibold text-ink-gray-8">
                {{ __("5. Verify your integration") }}
              </h2>
              <p class="text-p-sm text-ink-gray-6 mt-1">
                {{
                  __(
                    "Paste a user_id and the user_hash your server computed (plus any email / phone / exp you signed) to confirm the HMAC matches before turning on enforcement."
                  )
                }}
              </p>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <FormControl :label="__('user_id')" type="text" v-model="verifyForm.user_id" placeholder="123" />
              <FormControl :label="__('user_hash')" type="text" v-model="verifyForm.user_hash" placeholder="abc123…" />
              <FormControl :label="__('email (optional)')" type="text" v-model="verifyForm.user_email" placeholder="user@example.com" />
              <FormControl :label="__('phone (optional)')" type="text" v-model="verifyForm.user_phone" placeholder="+201001234567" />
              <FormControl :label="__('exp (optional)')" type="text" v-model="verifyForm.exp" placeholder="1700000000" />
            </div>
            <div class="flex items-center gap-3">
              <Button
                :label="__('Verify')"
                variant="subtle"
                :loading="verifying"
                :disabled="!selectedAccount?.secret_set"
                @click="runVerify"
              />
              <span v-if="!selectedAccount?.secret_set" class="text-p-xs text-ink-gray-5">
                {{ __("Generate a secret first (step 2).") }}
              </span>
              <span
                v-else-if="verifyResult"
                class="text-p-sm font-medium"
                :class="verifyResult.valid ? 'text-ink-green-6' : 'text-ink-red-6'"
              >
                {{ verifyResult.valid ? __("✓ Valid — HMAC matches, not expired") : "✗ " + verifyReasonText(verifyResult.reason) }}
              </span>
            </div>
          </section>

          <Divider />

          <!-- ── Step 6: Turn on enforcement ── -->
          <section class="flex flex-col gap-4">
            <h2 class="text-base-semibold text-ink-gray-8">
              {{ __("6. Turn on enforcement") }}
            </h2>
            <div class="flex items-center justify-between py-3">
              <div class="flex flex-col gap-0.5">
                <span class="text-base text-ink-gray-8">{{ __("Enforce verified identity") }}</span>
                <span class="text-p-sm text-ink-gray-6">
                  {{
                    __(
                      "Reject any bootstrap that presents a user_id or user_hash but fails HMAC verification. Anonymous visitors are unaffected. Enable only after step 5 confirms your server-side hash works."
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
  FileUploader,
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

// Reuse note: this component + WidgetPreview.vue are portable to any Frappe SPA.
// Two seams to change when porting (e.g. to Frappe CRM): (1) WEBCHAT_API below →
// point at that app's gated wrapper (e.g. "crm.api_webchat"); (2) the
// SettingsLayoutBase import path (CRM ships an identical-API layout). The neutral
// account CRUD lives once in axon (axon.axon_webchat.api); each SPA calls its own
// gated wrapper of the same shape. copyToClipboard / __ / frappe-ui resolve under @/.
const WEBCHAT_API = "axon_helpdesk.api_webchat";

// ── Tabs / preview UI state (presentational only) ──────────────────────────────
const activeTab = ref("appearance");
// Guard leaving Appearance with unsaved edits. TabButtons is a v-model with no
// interception point, so revert here; suppress the re-entrant revert with a flag.
let revertingTab = false;
watch(activeTab, (to, from) => {
  if (revertingTab) {
    revertingTab = false;
    return;
  }
  if (from === "appearance" && isDirty.value && !window.confirm(__("Discard unsaved changes?"))) {
    revertingTab = true;
    activeTab.value = from;
  }
});
const previewState = ref<"closed" | "chat" | "home">("home");
const showHashCode = ref(false);
const swatches = ["#2563eb", "#16a34a", "#db2777", "#ea580c", "#7c3aed", "#0891b2"];

// ── Resource ─────────────────────────────────────────────────────────────────
const settings = createResource({
  url: `${WEBCHAT_API}.get_webchat_settings`,
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

// Bumped to force the account <select> to remount at the correct model-value when a
// switch is cancelled (a native controlled select keeps the rejected choice otherwise).
const acctSelectNonce = ref(0);

function selectAccount(name: string) {
  // Guard unsaved appearance edits. On cancel, leave selectedName untouched and remount
  // the select so it snaps back to the still-selected account.
  if (isDirty.value && !window.confirm(__("Discard unsaved changes?"))) {
    acctSelectNonce.value++;
    return;
  }
  selectedName.value = name;
  revealedSecret.value = null;
  verifyResult.value = null;   // don't carry a "Valid" result across accounts
  // syncAppearanceFromAccount runs via the selectedAccount watcher.
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
    await call(`${WEBCHAT_API}.update_origins`, {
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
const siteOrigin = window.location.origin;

const basicSnippet = computed(() =>
  selectedAccount.value
    ? `<script src="${siteOrigin}/webchat/widget.js" data-widget-key="${selectedAccount.value.widget_key}"><\/script>`
    : ""
);

const pythonSample = `import hmac, hashlib, time
exp = str(int(time.time()) + 3600)  # or "" to skip expiry
user_hash = hmac.new(SECRET.encode(), f"{user_id}\\n{email or ''}\\n{phone or ''}\\n{exp}".encode(), hashlib.sha256).hexdigest()`;

const nodeSample = `const crypto = require('crypto');
const exp = String(Math.floor(Date.now() / 1000) + 3600); // or '' to skip expiry
const user_hash = crypto.createHmac('sha256', SECRET).update([user_id, email || '', phone || '', exp].join('\\n')).digest('hex');`;

// The command-queue shim MUST come before the loader tag (widget.js drains axw.q on
// load). Add it once in <head>, then call boot after your async login resolves.
const bootSample = `<!-- In your page's <head>, BEFORE the loader <script> from step 1: -->
<script>window.axw=window.axw||function(){(axw.q=axw.q||[]).push([].slice.call(arguments))}<\/script>

<!-- Then, once your async login resolves, boot with the SIGNED values from your server: -->
<script>
axw('boot', {
  user_id: '123',
  user_hash: server.user_hash,  // computed on YOUR server — never in the browser
  email: 'user@example.com',
  phone: '+201001234567',       // optional
  name: 'Jane Smith',
  exp: server.exp,              // the exact exp your server signed (omit if unsigned)
});
<\/script>`;

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
    const result = await call(`${WEBCHAT_API}.rotate_verify_secret`, {
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
    await call(`${WEBCHAT_API}.set_enforce`, {
      account: selectedAccount.value.name,
      enabled: val ? 1 : 0,
    });
    await settings.reload();
  } catch (e: any) {
    selectedAccount.value.enforce = prev; // revert
    toast.error(e?.messages?.[0] || __("Failed to update enforcement."));
  }
}

// ── Verify integration (step 5) ─────────────────────────────────────────────────
const verifyForm = ref({ user_id: "", user_hash: "", user_email: "", user_phone: "", exp: "" });
const verifying = ref(false);
const verifyResult = ref<{ valid: boolean; reason: string } | null>(null);

const VERIFY_REASONS: Record<string, string> = {
  hash_mismatch: __("Hash mismatch — user_hash does not match what the secret signs."),
  expired: __("Expired — the exp timestamp is in the past."),
  no_secret: __("No secret set — generate one in step 2."),
};
function verifyReasonText(reason: string) {
  return VERIFY_REASONS[reason] || reason;
}

async function runVerify() {
  if (!selectedAccount.value) return;
  verifying.value = true;
  verifyResult.value = null;
  try {
    verifyResult.value = await call(`${WEBCHAT_API}.verify_identity_hash`, {
      account: selectedAccount.value.name,
      user_id: verifyForm.value.user_id,
      user_hash: verifyForm.value.user_hash,
      user_email: verifyForm.value.user_email,
      user_phone: verifyForm.value.user_phone,
      exp: verifyForm.value.exp,
    });
  } catch (e: any) {
    toast.error(e?.messages?.[0] || __("Verification failed."));
  } finally {
    verifying.value = false;
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
  home_background_color: "",
  home_background_gradient_color: "",
  header_text_color: "White",
  tagline: "",
  reply_expectation_text: "",
  logo: "",
  avatar_image_1: "",
  avatar_image_2: "",
  avatar_image_3: "",
  show_agent_read_receipts: 0,
  enable_help_space: 0,
  sound_enabled: 1,
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
    home_background_color: a.home_background_color ?? "",
    home_background_gradient_color: a.home_background_gradient_color ?? "",
    header_text_color: a.header_text_color ?? "White",
    tagline: a.tagline ?? "",
    reply_expectation_text: a.reply_expectation_text ?? "",
    logo: a.logo ?? "",
    avatar_image_1: a.avatar_image_1 ?? "",
    avatar_image_2: a.avatar_image_2 ?? "",
    avatar_image_3: a.avatar_image_3 ?? "",
    show_agent_read_receipts: a.show_agent_read_receipts ?? 0,
    enable_help_space: a.enable_help_space ?? 0,
    sound_enabled: a.sound_enabled ?? 1,
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
    await call(`${WEBCHAT_API}.update_appearance`, {
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

// Image uploader configs — drives the v-for in the logo/avatar block.
const imageUploaders = [
  { key: "logo", label: __("Logo") },
  { key: "avatar_image_1", label: __("Teammate avatar 1") },
  { key: "avatar_image_2", label: __("Teammate avatar 2") },
  { key: "avatar_image_3", label: __("Teammate avatar 3") },
] as const;

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
    const created = await call(`${WEBCHAT_API}.create_webchat_account`, {
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

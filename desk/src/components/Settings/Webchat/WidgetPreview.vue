<template>
  <!-- Neutral "your website" backdrop -->
  <div class="wp-backdrop">
    <div class="wp-dots">
      <span></span><span></span><span></span>
    </div>

    <!-- Closed: 56px launcher circle in the configured corner -->
    <div
      class="wp-launcher"
      :class="isLeft ? 'wp-left' : 'wp-right'"
      :style="cornerStyle"
      :data-open="state === 'open'"
      aria-hidden="true"
    >
      <!-- Exact .axon-ico-open glyph from axon/www/webchat/widget.js -->
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
        />
      </svg>
    </div>

    <!-- Open: panel docked to the same corner, mirrors webchat.html -->
    <div
      class="wp-panel"
      :class="isLeft ? 'wp-left' : 'wp-right'"
      :style="cornerStyle"
      :data-open="state === 'open'"
    >
      <div class="wp-header">
        <div class="wp-title-row">
          <span class="wp-dot"></span>
          <span class="wp-title">{{ appearance.widget_title || "Chat" }}</span>
        </div>
        <div class="wp-subtitle">We usually reply within a few minutes.</div>
      </div>
      <div class="wp-log">
        <div class="wp-msg wp-in">
          {{ appearance.greeting || "Hi! How can we help?" }}
        </div>
        <div class="wp-msg wp-out">Hi 👋</div>
      </div>
      <div class="wp-composer">
        <div class="wp-input">Type a message…</div>
        <div class="wp-send">Send</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

// Reuse: dependency-free (imports only vue; inline styles, no app utils) — copy-paste
// portable to any Frappe SPA (e.g. Frappe CRM) with zero edits.
// ponytail: presentational mock, not the real /webchat iframe. Mirrors
// webchat.html's load-bearing tokens (primary usage, 12px msg bubbles, 56px
// launcher, header layout, chat SVG glyph). It can drift if webchat.html
// restyles — deep parity is not the goal (Intercom's own preview is a mock).
const props = defineProps<{
  appearance: Record<string, any>;
  state: "closed" | "open";
}>();

const isLeft = computed(() => props.appearance.launcher_position === "Left");

// Corner offsets + primary color as inline CSS vars, live from `appearance`.
const cornerStyle = computed(() => ({
  "--wp-primary": props.appearance.primary_color || "#2563eb",
  "--wp-side": `${props.appearance.side_spacing ?? 20}px`,
  "--wp-bottom": `${props.appearance.bottom_spacing ?? 20}px`,
}));
</script>

<style scoped>
.wp-backdrop {
  position: relative;
  overflow: hidden;
  height: 360px;
  border-radius: 12px;
  background: repeating-linear-gradient(
      -45deg,
      rgba(0, 0, 0, 0.015) 0 12px,
      transparent 12px 24px
    ),
    #eceef1;
  border: 1px solid #e2e4e9;
}

.wp-dots {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  gap: 6px;
}
.wp-dots span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #cbcfd6;
}

/* ── Launcher (closed) — 56px circle, primary bg, white 26px glyph ── */
.wp-launcher {
  position: absolute;
  bottom: var(--wp-bottom, 20px);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--wp-primary, #2563eb);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
}
.wp-launcher.wp-right {
  right: var(--wp-side, 20px);
}
.wp-launcher.wp-left {
  left: var(--wp-side, 20px);
}
.wp-launcher svg {
  width: 26px;
  height: 26px;
}
.wp-launcher[data-open="true"] {
  opacity: 0;
  pointer-events: none;
}

/* ── Panel (open) — docked same corner, ~0.85 scale ── */
.wp-panel {
  position: absolute;
  bottom: var(--wp-bottom, 20px);
  width: 300px;
  height: 320px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.22);
  transform: scale(0.85);
}
.wp-panel.wp-right {
  right: var(--wp-side, 20px);
  transform-origin: bottom right;
}
.wp-panel.wp-left {
  left: var(--wp-side, 20px);
  transform-origin: bottom left;
}
.wp-panel[data-open="false"] {
  opacity: 0;
  pointer-events: none;
}
.wp-panel.wp-right[data-open="false"] {
  transform: scale(0.6) translateY(8px);
}
.wp-panel.wp-left[data-open="false"] {
  transform: scale(0.6) translateY(8px);
}

.wp-header {
  background: var(--wp-primary, #2563eb);
  color: #fff;
  padding: 12px 16px;
  font-weight: 600;
}
.wp-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.wp-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  flex: none;
}
.wp-title {
  font-size: 14px;
}
.wp-subtitle {
  font-weight: 400;
  font-size: 12px;
  opacity: 0.85;
  margin-top: 2px;
}

.wp-log {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f7f7f9;
  overflow: hidden;
}
.wp-msg {
  max-width: 78%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 14px;
  white-space: pre-wrap;
  word-wrap: break-word;
}
.wp-in {
  align-self: flex-start;
  background: #e9e9ef;
  color: #111;
}
.wp-out {
  align-self: flex-end;
  background: var(--wp-primary, #2563eb);
  color: #fff;
}

.wp-composer {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-top: 1px solid #e5e5ea;
}
.wp-input {
  flex: 1;
  border: 1px solid #d0d0d8;
  border-radius: 20px;
  padding: 8px 14px;
  font-size: 14px;
  color: #9ca3af;
}
.wp-send {
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 14px;
  background: var(--wp-primary, #2563eb);
  color: #fff;
}

/* Motion only when the user hasn't asked to reduce it; end-state is plain CSS
   above, so reduced-motion renders the correct final state instantly. */
@media (prefers-reduced-motion: no-preference) {
  .wp-launcher {
    transition: left 0.25s ease, right 0.25s ease, bottom 0.25s ease,
      opacity 0.2s ease;
  }
  .wp-panel {
    transition: left 0.25s ease, right 0.25s ease, bottom 0.25s ease,
      opacity 0.22s cubic-bezier(0.4, 0, 0.2, 1),
      transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  }
}
</style>

/**
 * channels store — the ticket-view extension manifest (channels + side panels).
 *
 * Mirrors the telephony store's "dormant on error" posture (createResource, auto,
 * never throws into the UI). Populated from helpdesk.api.extensions.get_extensions_manifest,
 * which aggregates the `helpdesk_channels` / `helpdesk_ticket_panels` hooks contributed
 * by installed plugin apps. The SPA reads ONLY this manifest — adapter dotted paths stay
 * server-side.
 */

import { defineStore } from "pinia";
import { createResource } from "frappe-ui";
import { markRaw, ref, type Component } from "vue";

import CommentIcon from "@/components/icons/CommentIcon.vue";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon.vue";

export interface ChannelManifestEntry {
  channel_key: string;
  label: string;
  icon: string;
  capabilities: Record<string, boolean>;
  // Optional composer toolbar markers — declared by the plugin (wire-format syntax).
  text_markers?: { marker: string; label: string; icon: string }[];
}

export interface PanelManifestEntry {
  panel_key: string;
  title: string;
  type: "html" | "relations";
  api?: string;
  create_api?: string | null;
  condition_field?: string | null;
  pinned?: boolean;
  order?: number;
}

// Icon key -> component. Fork ships channel icons (Chatwoot precedent); unknown keys
// fall back to the generic comment bubble so a new channel still renders a tab.
const ICONS: Record<string, Component> = {
  whatsapp: WhatsAppIcon,
};

export function channelIcon(key: string): Component {
  return markRaw(ICONS[key] || CommentIcon);
}

export const useChannelsStore = defineStore("channels", () => {
  const channels = ref<ChannelManifestEntry[]>([]);
  const panels = ref<PanelManifestEntry[]>([]);

  const resource = createResource({
    url: "helpdesk.api.extensions.get_extensions_manifest",
    auto: true,
    onSuccess(data: { channels?: ChannelManifestEntry[]; panels?: PanelManifestEntry[] }) {
      channels.value = data?.channels ?? [];
      panels.value = data?.panels ?? [];
    },
    onError() {
      // Manifest endpoint missing / not an agent — stay empty, UI behaves stock.
      channels.value = [];
      panels.value = [];
    },
  });

  return { channels, panels, resource };
});

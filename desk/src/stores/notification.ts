import { useAuthStore } from "@/stores/auth";
import { ListResource, Notification } from "@/types";
import { isCustomerPortal } from "@/utils";
import { createListResource, createResource } from "frappe-ui";
import { call } from "frappe-ui";
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { globalStore } from "./globalStore";
import { useSocketEvent } from "@/composables/useSocketEvent";
import { router } from "@/router";

export const useNotificationStore = defineStore("notification", () => {
  const authStore = useAuthStore();

  const visible = ref(false);

  const resource: ListResource<Notification> = createListResource({
    doctype: "HD Notification",
    cache: "Notifications",
    fields: [
      "creation",
      "message",
      "name",
      "notification_type",
      "read",
      "reference_comment",
      "reference_ticket",
      "user_from",
      "user_to",
    ],
    orderBy: "modified desc",
  });
  const clear = createResource({
    url: "helpdesk.helpdesk.doctype.hd_notification.utils.clear",
    auto: false,
    onSuccess: () => resource.reload(),
  });

  const read = (ticket: string) => {
    createResource({
      url: "helpdesk.helpdesk.doctype.hd_notification.utils.clear",
      auto: true,
      params: {
        ticket,
      },
      onSuccess: () => resource.reload(),
    });
  };

  const data = computed(() => resource.data || []);
  const unread = computed(() => data.value.filter((d) => !d.read).length);

  function toggle() {
    visible.value = !visible.value;
  }

  watch(
    () => authStore.hasDeskAccess,
    (newVal) => {
      if (!newVal) return;
      resource.filters = {
        user_to: ["=", authStore.userId],
      };
      resource.reload();
    },
    { immediate: true }
  );

  // Tab-title unread signifier. document.title has several writers (usePageMeta
  // on ticket pages, mobile pages, this prefix) — instead of owning the base
  // title, re-apply the "(n) " prefix over whatever the current writer set:
  // watch covers unread changes, the MutationObserver covers foreign writes.
  let selfWrite = false;
  function applyTitlePrefix() {
    if (isCustomerPortal.value) return;
    const base = document.title.replace(/^\(\d+\)\s/, "");
    const next = unread.value ? `(${unread.value}) ${base}` : base;
    if (next !== document.title) {
      selfWrite = true;
      document.title = next;
    }
  }
  watch(unread, applyTitlePrefix);
  const titleEl = document.head?.querySelector("title");
  if (titleEl) {
    new MutationObserver(() => {
      if (selfWrite) {
        selfWrite = false;
        return;
      }
      applyTitlePrefix();
    }).observe(titleEl, { childList: true });
  }

  // On socket (re)connect, resync: events published while disconnected are
  // simply lost, so the bell would silently drift stale without this.
  useSocketEvent("connect", () => {
    if (isCustomerPortal.value) return;
    resource.reload();
  });

  // Legacy broadcast kept for the extension-off state: with the notifications
  // feature disabled the sink never publishes helpdesk:notification, and this
  // is what live-refreshes the bell on reactions (stock behavior).
  useSocketEvent("helpdesk:comment-reaction-update", () => {
    if (isCustomerPortal.value) return;
    resource.reload();
  });

  useSocketEvent("helpdesk:notification", (data: Record<string, any>) => {
    if (isCustomerPortal.value) return;
    const { name, notification_type, reference_ticket } = data;
    const route = router.currentRoute.value;
    if (
      notification_type === "Reply" &&
      route.name === "TicketAgent" &&
      String(route.params.ticketId) === String(reference_ticket) &&
      document.visibilityState === "visible"
    ) {
      call("axe_helpdesk.features.notifications.api.mark_notification_read", {
        name,
      })
        .catch(() => {})
        .finally(() => resource.reload());
    } else {
      resource.reload();
    }
  });

  return {
    clear,
    data,
    toggle,
    read,
    unread,
    visible,
    resource,
  };
});

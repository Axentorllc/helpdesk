import { isCustomerPortal } from "@/utils";
import { call } from "frappe-ui";
import { ref } from "vue";

type PrefKey = "Reply" | "Mention" | "Assignment" | "Reaction";

const prefs = ref<Record<PrefKey, boolean>>({
  Reply: true,
  Mention: true,
  Assignment: true,
  Reaction: true,
});

// Hidden when the endpoint is unavailable (feature not deployed / toggle off).
const available = ref(true);

let reconciled = false;

function syncFromServer() {
  if (reconciled || isCustomerPortal.value) return;
  reconciled = true;
  call("axe_helpdesk.features.notifications.api.get_notification_prefs")
    .then((data: Record<PrefKey, boolean>) => {
      prefs.value = { ...prefs.value, ...data };
    })
    .catch(() => {
      available.value = false;
    });
}

function setPref(key: PrefKey, value: boolean) {
  prefs.value[key] = value; // optimistic
  call("axe_helpdesk.features.notifications.api.set_notification_prefs", {
    prefs: prefs.value,
  }).catch(() => {}); // silent on failure
}

export function useNotificationPrefs() {
  syncFromServer();
  return { prefs, available, setPref };
}

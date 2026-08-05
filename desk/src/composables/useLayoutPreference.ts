import { isCustomerPortal } from "@/utils";
import { call } from "frappe-ui";
import { ref } from "vue";

// Per-user agent ticket layout: "classic" (full-width detail, today's behavior)
// or "split" (Gmail-style list + detail pane). Persisted server-side via
// frappe.defaults, mirrored to localStorage so first paint doesn't flash the
// wrong layout before the server value resolves.
const STORAGE_KEY = "helpdesk_agent_layout";

const splitView = ref(localStorage.getItem(STORAGE_KEY) === "split");

let reconciled = false;

// Reconcile the local mirror from the server once per session. Agent-only:
// the customer portal must never touch the preference.
function syncFromServer() {
  if (reconciled || isCustomerPortal.value) return;
  reconciled = true;
  call("helpdesk.api.general.get_agent_layout")
    .then((layout: string) => {
      splitView.value = layout === "split";
      localStorage.setItem(STORAGE_KEY, layout);
    })
    .catch(() => {}); // offline/transient failure: keep the local mirror
}

function setLayout(layout: "classic" | "split") {
  const split = layout === "split";
  if (split === splitView.value) return;
  splitView.value = split;
  localStorage.setItem(STORAGE_KEY, layout);
  call("helpdesk.api.general.set_agent_layout", { layout });
}

export function useLayoutPreference() {
  syncFromServer();
  return { splitView, setLayout };
}

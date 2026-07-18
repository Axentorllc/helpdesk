"""Extension surface: aggregate plugin-contributed channels + ticket panels.

Two hooks keys (proven `frappe.get_hooks` list-of-dicts pattern) let plugins enrich
the agent UI without touching the fork: `helpdesk_channels` (a messaging channel with
a server-side adapter + capability flags) and `helpdesk_ticket_panels` (a data-driven
side panel). The manifest is the ONLY thing the SPA reads — the `adapter` dotted path
is server-side only and never crosses to the client.
"""

import frappe

from helpdesk.utils import agent_only


@frappe.whitelist()
@agent_only
def get_extensions_manifest():
    """Return {channels, panels} aggregated across installed apps' hooks.

    `adapter` is stripped from every channel entry — the client dispatches by
    `channel_key` and the fork resolves the adapter from hooks server-side
    (channels.py), so the dotted path never reaches the browser. Panels are
    ordered by `order` (default 100) so pinned/primary panels render first.
    """
    channels = [
        {k: v for k, v in c.items() if k != "adapter"}
        for c in (frappe.get_hooks("helpdesk_channels") or [])
    ]
    panels = sorted(
        frappe.get_hooks("helpdesk_ticket_panels") or [],
        key=lambda p: p.get("order") or 100,
    )
    return {"channels": channels, "panels": panels}

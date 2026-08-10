"""Extension surface: aggregate plugin-contributed channels + ticket panels.

Two hooks keys (proven `frappe.get_hooks` list-of-dicts pattern) let plugins enrich
the agent UI without touching the fork: `helpdesk_channels` (a messaging channel with
a server-side adapter + capability flags) and `helpdesk_ticket_panels` (a data-driven
side panel). The manifest is the ONLY thing the SPA reads — the `adapter` and `enabled`
dotted paths are server-side only and never cross to the client.
"""

import frappe

from helpdesk.utils import agent_only


def _entry_enabled(entry: dict) -> bool:
    """Return False if the entry declares an `enabled` callable that returns falsy.

    Missing `enabled` key → True (opt-in; existing entries unaffected).
    Import/call errors → logged + False (bad dotted path shouldn't surface the panel).
    """
    dotted = entry.get("enabled")
    if not dotted:
        return True
    try:
        return bool(frappe.get_attr(dotted)())
    except Exception:
        frappe.log_error(title=f"extensions._entry_enabled: {dotted}")
        return False


@frappe.whitelist()
@agent_only
def get_extensions_manifest():
    """Return {channels, panels} aggregated across installed apps' hooks.

    `adapter` and `enabled` are stripped from every entry — the client dispatches by
    `channel_key` / `panel_key` and the fork resolves the adapter from hooks server-side
    (channels.py), so those dotted paths never reach the browser. Panels are ordered by
    `order` (default 100) so pinned/primary panels render first. Entries whose `enabled`
    callable returns falsy are excluded from the manifest entirely.
    """
    _STRIP = {"adapter", "enabled"}
    channels = [
        {k: v for k, v in c.items() if k not in _STRIP}
        for c in (frappe.get_hooks("helpdesk_channels") or [])
        if _entry_enabled(c)
    ]
    panels = sorted(
        (
            {k: v for k, v in p.items() if k not in _STRIP}
            for p in (frappe.get_hooks("helpdesk_ticket_panels") or [])
            if _entry_enabled(p)
        ),
        key=lambda p: p.get("order") or 100,
    )
    settings_sections = [
        {k: v for k, v in s.items() if k not in _STRIP}
        for s in (frappe.get_hooks("helpdesk_settings_sections") or [])
        if _entry_enabled(s)
    ]
    return {"channels": channels, "panels": panels, "settings_sections": settings_sections}

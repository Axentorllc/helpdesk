import frappe
from frappe.translate import get_all_translations

AGENT_LAYOUT_KEY = "helpdesk_agent_layout"
AGENT_LAYOUTS = ("classic", "split")


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_translations():
    language = None
    if frappe.session.user != "Guest":
        language = frappe.db.get_value("User", frappe.session.user, "language")
    if not language:
        language = frappe.db.get_single_value("System Settings", "language")
    return get_all_translations(language)


@frappe.whitelist(methods=["GET"])
def get_agent_layout():
    """Per-user agent ticket layout preference ("classic" or "split")."""
    return frappe.defaults.get_user_default(AGENT_LAYOUT_KEY) or "classic"


@frappe.whitelist(methods=["POST"])
def set_agent_layout(layout: str):
    """Persist the per-user agent ticket layout preference."""
    if layout not in AGENT_LAYOUTS:
        frappe.throw(f"Invalid layout: {layout}")
    frappe.defaults.set_user_default(AGENT_LAYOUT_KEY, layout)
    return layout

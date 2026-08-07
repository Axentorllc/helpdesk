import frappe


def emit_notification(kind: str, context: dict) -> bool:
    """Publish a notification-worthy event to `helpdesk_notification_sink` handlers.

    Each handler is `(kind, context) -> bool`; the first truthy return marks the
    event handled and callers skip stock behavior. Exceptions are logged and the
    next handler runs. No handler (or none truthy) → False → stock behavior runs.
    """
    for path in frappe.get_hooks("helpdesk_notification_sink"):
        try:
            if frappe.get_attr(path)(kind, context):
                return True
        except Exception:
            frappe.log_error(
                frappe.get_traceback(),
                f"helpdesk_notification_sink failed: {path}",
            )
    return False


@frappe.whitelist()
def clear(ticket: str | None = None, comment: str | None = None):
    """
    Mark notifications as read. No arguments will clear all notifications for `user`.

    :param ticket: Ticket to clear notifications for
    :param comment: Comment to clear notifications for
    """
    filters = {"user_to": frappe.session.user, "read": False}
    if ticket:
        filters["reference_ticket"] = ticket
    if comment:
        filters["reference_comment"] = comment
    for notification in frappe.get_all(
        "HD Notification", filters=filters, pluck="name"
    ):
        frappe.db.set_value(
            "HD Notification", notification, "read", 1, update_modified=False
        )

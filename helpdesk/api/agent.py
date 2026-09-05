import frappe
from frappe import _

from helpdesk.utils import agent_only, get_agent_name


@frappe.whitelist()
@agent_only
def sent_invites(emails: list[str], send_welcome_mail_to_user: bool = True):
    for email in emails:
        if frappe.db.exists("User", email):
            user = frappe.get_doc("User", email)
        else:
            user = frappe.get_doc(
                {"doctype": "User", "email": email, "first_name": email.split("@")[0]}
            ).insert()

            if send_welcome_mail_to_user:
                user.send_welcome_mail_to_user()

        frappe.get_doc(
            {
                "doctype": "HD Agent",
                "ID": email,
                "user": user.name,
                "agent_name": user.full_name,
                "user_image": user.user_image,
            }
        ).insert()


@frappe.whitelist()
@agent_only
def set_my_availability(availability: str) -> dict:
    # ponytail: compat shim for pre-1.30 callers (axe_helpdesk override, mobile);
    # validation + socket broadcast now live on the HD Agent controller. Remove once
    # axe_helpdesk drops its override.
    name = get_agent_name()
    if not name:
        frappe.throw(_("No HD Agent record for current user"), frappe.ValidationError)
    agent = frappe.get_doc("HD Agent", name)
    agent.availability = availability
    agent.save()
    return {"availability": agent.availability}

"""Channel dispatch: route generic thread/template/send calls to a plugin adapter.

The adapter dotted path is resolved ONLY from the `helpdesk_channels` hook, never from
client input — the client passes an opaque `channel_key` and the fork looks up the
server-side adapter. Adapter contract (per plugin, all `frappe.get_attr`-callable):
    get_thread(ticket)                                   -> {conversation, messages, ...}
    list_templates(language=None)                        -> {templates: [...]}
    send(conversation, message=, template=, template_params=) -> {message_name, message_id}
    format_html(html)  [optional]                        -> channel wire-format text
Send raises frappe.ValidationError with user-facing messages (composer toasts).
"""

import frappe
from frappe import _

from helpdesk.utils import agent_only


def _channel_entry(channel):
    """Return the hook entry for `channel`, or throw DoesNotExistError.

    Adapter resolution is hooks-only: the caller-supplied `channel` is matched against
    registered `channel_key`s — a value the client cannot use to point us at an
    arbitrary dotted path.
    """
    for c in frappe.get_hooks("helpdesk_channels") or []:
        if c.get("channel_key") == channel:
            return c
    frappe.throw(_("Unknown channel: {0}").format(channel), frappe.DoesNotExistError)


def _adapter_fn(channel, fn):
    entry = _channel_entry(channel)
    return frappe.get_attr(entry["adapter"] + "." + fn), entry


@frappe.whitelist(methods=["GET"])
@agent_only
def get_thread(channel, ticket):
    fn, _entry = _adapter_fn(channel, "get_thread")
    return fn(ticket)


@frappe.whitelist(methods=["GET"])
@agent_only
def list_templates(channel, language=None):
    entry = _channel_entry(channel)
    capabilities = entry.get("capabilities") or {}
    if not capabilities.get("templates"):
        return {"templates": []}
    return frappe.get_attr(entry["adapter"] + ".list_templates")(language=language)


@frappe.whitelist(methods=["POST"])
@agent_only
def send(channel, conversation, message=None, template=None, template_params=None,
         attachments=None):
    fn, entry = _adapter_fn(channel, "send")
    if attachments and not (entry.get("capabilities") or {}).get("media"):
        frappe.throw(_("This channel does not support media attachments."))
    return fn(
        conversation,
        message=message,
        template=template,
        template_params=template_params,
        attachments=attachments,
    )


@frappe.whitelist(methods=["POST"])
@agent_only
def format_html(channel, html):
    """Convert rich HTML (e.g. a saved reply) to the channel's wire format.

    Dispatches to the adapter's optional `format_html(html)`; falls back to
    stripped plain text so channels without a formatter still get usable text.
    """
    entry = _channel_entry(channel)
    try:
        fn = frappe.get_attr(entry["adapter"] + ".format_html")
    except (AttributeError, ImportError):
        return {"text": frappe.utils.strip_html(html or "")}
    return {"text": fn(html)}

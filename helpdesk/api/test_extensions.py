from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from helpdesk.api import channels, extensions
from helpdesk.test_utils import create_agent

# A fake channel with a server-side adapter + capability flags, plus two panels out of
# order — enough to exercise aggregation, adapter-stripping and order-sorting without
# depending on any real plugin being installed.
_FAKE_CHANNELS = [
    {
        "channel_key": "fake",
        "label": "Fake",
        "icon": "fake",
        "adapter": "helpdesk.api.test_extensions",  # points at the module-level fakes below
        "capabilities": {"templates": True, "media": True},
    }
]
_FAKE_PANELS = [
    {"panel_key": "second", "title": "Second", "type": "html", "order": 20},
    {"panel_key": "first", "title": "First", "type": "relations", "order": 10},
]


# ── Fake adapter (module-level so the dotted path resolves via frappe.get_attr) ──

def get_thread(ticket):
    return {"conversation": {"source_id": "s1"}, "messages": [], "ticket": ticket}


def get_state(conversation):
    return {"window_open": True, "source_id": "s1", "conversation": conversation}


def list_templates(language=None):
    return {"templates": [{"name": "t1", "language_code": language}]}


def send(conversation, message=None, template=None, template_params=None):
    return {"message_name": "m1", "message_id": "wamid.x", "conversation": conversation}


def _hooks_side_effect(key):
    """Return distinct lists per hook key so channel/panel assertions don't cross-talk."""
    if key == "helpdesk_channels":
        return list(_FAKE_CHANNELS)
    if key == "helpdesk_ticket_panels":
        return list(_FAKE_PANELS)
    return frappe.get_hooks(key)  # NB: patched target is a different callable; real one here


class TestExtensions(FrappeTestCase):
    original_user = None

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.original_user = frappe.session.user
        create_agent("helpdesk-ext-agent@example.com")

    def setUp(self):
        frappe.set_user("helpdesk-ext-agent@example.com")

    def tearDown(self):
        frappe.set_user(self.original_user or "Administrator")

    # get_hooks is patched to a plain function; its own fallback branch calls the
    # real frappe.get_hooks, but the two keys under test are always intercepted.
    def _patch_hooks(self):
        return patch("frappe.get_hooks", side_effect=lambda key, *a, **k: (
            list(_FAKE_CHANNELS) if key == "helpdesk_channels"
            else list(_FAKE_PANELS) if key == "helpdesk_ticket_panels"
            else []
        ))

    def test_manifest_aggregates_channels_and_panels(self):
        with self._patch_hooks():
            manifest = extensions.get_extensions_manifest()
        self.assertEqual(len(manifest["channels"]), 1)
        self.assertEqual(manifest["channels"][0]["channel_key"], "fake")
        self.assertEqual(len(manifest["panels"]), 2)

    def test_manifest_strips_adapter_from_channel(self):
        with self._patch_hooks():
            manifest = extensions.get_extensions_manifest()
        self.assertNotIn("adapter", manifest["channels"][0])
        # capabilities (a nested dict) survives the strip intact.
        self.assertEqual(manifest["channels"][0]["capabilities"]["templates"], True)

    def test_manifest_panels_sorted_by_order(self):
        with self._patch_hooks():
            manifest = extensions.get_extensions_manifest()
        self.assertEqual(
            [p["panel_key"] for p in manifest["panels"]], ["first", "second"]
        )

    def test_dispatch_get_thread_hits_adapter(self):
        with self._patch_hooks():
            result = channels.get_thread("fake", "TICKET-1")
        self.assertEqual(result["ticket"], "TICKET-1")
        self.assertEqual(result["conversation"]["source_id"], "s1")

    def test_dispatch_send_hits_adapter(self):
        with self._patch_hooks():
            result = channels.send("fake", "CONV-1", message="hi")
        self.assertEqual(result["message_name"], "m1")
        self.assertEqual(result["conversation"], "CONV-1")

    def test_unknown_channel_throws(self):
        with self._patch_hooks():
            with self.assertRaises(frappe.DoesNotExistError):
                channels.get_thread("nope", "TICKET-1")

    def test_list_templates_empty_when_capability_off(self):
        no_tmpl = [
            {"channel_key": "fake", "adapter": "helpdesk.api.test_extensions",
             "capabilities": {"templates": False}}
        ]
        with patch("frappe.get_hooks", side_effect=lambda key, *a, **k: (
            list(no_tmpl) if key == "helpdesk_channels" else []
        )):
            result = channels.list_templates("fake")
        self.assertEqual(result, {"templates": []})

    def test_list_templates_hits_adapter_when_capability_on(self):
        with self._patch_hooks():
            result = channels.list_templates("fake", language="ar")
        self.assertEqual(result["templates"][0]["language_code"], "ar")

    def test_agent_only_blocks_non_agent(self):
        website_user = "helpdesk-ext-website@example.com"
        if not frappe.db.exists("User", website_user):
            frappe.get_doc({
                "doctype": "User",
                "email": website_user,
                "first_name": "website",
                "send_welcome_email": 0,
            }).insert(ignore_permissions=True)
        frappe.set_user(website_user)
        with self.assertRaises(frappe.PermissionError):
            extensions.get_extensions_manifest()

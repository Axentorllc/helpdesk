import frappe
from frappe.automation.doctype.assignment_rule.assignment_rule import AssignmentRule


def get_agents_by_category(category: str) -> set[str]:
    """User ids of HD Agents whose current status falls under the given category."""
    statuses = frappe.get_all(
        "HD Agent Status",
        filters={"category": category},
        pluck="name",
    )
    if not statuses:
        return set()
    return set(
        frappe.get_all(
            "HD Agent",
            filters={"availability": ["in", statuses]},
            pluck="user",
        )
    )


def get_assignment_candidates(rule, doc):
    """First non-None verdict from helpdesk_assignment_candidates handlers.

    None = no opinion (stock behavior); [] = veto; [users] = restricted pool.
    Mirrors emit_notification in hd_notification/utils.py.
    """
    for path in frappe.get_hooks("helpdesk_assignment_candidates"):
        try:
            verdict = frappe.get_attr(path)(rule, doc)
            if verdict is not None:
                return verdict
        except Exception:
            frappe.log_error(
                frappe.get_traceback(),
                f"helpdesk_assignment_candidates failed: {path}",
            )
    return None


class HelpdeskAssignmentRule(AssignmentRule):
    def get_user(self, doc):
        """
        Override get_user method from framework.
        always Active agents are preferred; fall back to Away if no Active is available;
        fall back to the full pool (including Unavailable) only if no one else
        is available, so the ticket is never left unassigned.
        """
        # Consult assignment policy extension hook first.
        verdict = get_assignment_candidates(self, doc)
        if verdict is not None:
            if not verdict:
                return None  # veto → no ToDo → ticket queued
            # Restrict pool to verdict users, run stock selection on that subset.
            return self._select_from_pool(verdict, doc)

        away = get_agents_by_category("Away")
        unavailable = get_agents_by_category("Unavailable")
        if not away and not unavailable:
            return super().get_user(doc)

        # "Based on Field" assigns through the document field, so the
        # availability filter does not apply.
        if self.rule == "Weighted Distribution":
            user_pool_fieldname = "weighted_users"
        elif self.rule in ("Round Robin", "Load Balancing"):
            user_pool_fieldname = "users"
        else:
            return super().get_user(doc)

        original_pool = getattr(self, user_pool_fieldname)
        active_only = [
            u for u in original_pool if u.user not in away and u.user not in unavailable
        ]
        not_unavailable = [u for u in original_pool if u.user not in unavailable]

        # Tier: Active → Away → full pool (Unavailable as last resort)
        if active_only:
            preferred_pool = active_only
        elif not_unavailable:
            preferred_pool = not_unavailable
        else:
            preferred_pool = original_pool

        return self._select_from_pool_rows(user_pool_fieldname, preferred_pool, original_pool, doc)

    def _select_from_pool(self, user_ids: list, doc) -> str | None:
        """Run stock selection over a restricted set of user IDs (list[str]).

        Filters the rule's child-table rows to those whose .user is in user_ids,
        then delegates to the parent get_user via the pool-swap trick.
        """
        if self.rule == "Weighted Distribution":
            user_pool_fieldname = "weighted_users"
        elif self.rule in ("Round Robin", "Load Balancing"):
            user_pool_fieldname = "users"
        else:
            return super().get_user(doc)  # Based on Field — bypass

        original_pool = getattr(self, user_pool_fieldname)
        verdict_set = set(user_ids)
        filtered_rows = [u for u in original_pool if u.user in verdict_set]
        if not filtered_rows:
            return None

        return self._select_from_pool_rows(user_pool_fieldname, filtered_rows, original_pool, doc)

    def _select_from_pool_rows(self, fieldname, pool_rows, original_pool, doc):
        """Swap in pool_rows, call super().get_user(doc), restore original_pool."""
        setattr(self, fieldname, pool_rows)
        try:
            return super().get_user(doc)
        finally:
            setattr(self, fieldname, original_pool)

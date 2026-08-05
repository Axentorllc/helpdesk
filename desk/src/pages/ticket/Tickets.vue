<template>
  <div :class="isCustomerPortal ? '' : 'flex flex-1 flex-col overflow-hidden'">
    <!-- Classic mode with a ticket open hides the whole list (pane + header) so the
         detail header owns #app-header exactly like the old full-page view. -->
    <LayoutHeader v-if="isCustomerPortal || splitView || !hasTicketOpen">
      <template #left-header>
        <ViewBreadcrumbs
          :label="__('Tickets')"
          :route-name="isCustomerPortal ? 'TicketsCustomer' : 'TicketsAgent'"
          :options="dropdownOptions"
          :dropdown-actions="(view) => viewActions(view, viewDialogConfig)"
          :current-view="currentView"
        />
      </template>
      <template #right-header>
        <RouterLink
          class="inline-flex"
          :to="{ name: isCustomerPortal ? 'TicketNew' : 'TicketAgentNew' }"
        >
          <Button
            class="rtl:flex-row-reverse"
            :label="__('Create')"
            theme="gray"
            variant="solid"
          >
            <template #prefix>
              <LucidePlus class="h-4 w-4" />
            </template>
          </Button>
        </RouterLink>
        <!-- Layout switcher (agent desktop only): always the last, right-most
             control so it keeps the same visual anchor as the ticket header. -->
        <LayoutToggle v-if="!isCustomerPortal" />
      </template>
    </LayoutHeader>
    <!-- Agent: list pane beside the detail child (split) or hidden behind it
         (classic). Customer portal keeps today's single-list render. -->
    <div v-if="!isCustomerPortal" class="flex flex-1 overflow-hidden">
      <div
        v-show="splitView || !hasTicketOpen"
        class="agent-ticket-list"
        :class="
          splitView && hasTicketOpen
            ? 'compact w-[420px] shrink-0 border-r overflow-hidden flex flex-col'
            : 'flex flex-1 flex-col overflow-hidden'
        "
      >
        <ListViewBuilder
          ref="listViewRef"
          :options="options"
          @row-click="
            (row) =>
              $router.push({
                name: 'TicketAgent',
                params: { ticketId: row },
              })
          "
        />
      </div>
      <RouterView class="flex flex-1 flex-col overflow-hidden" />
    </div>
    <ListViewBuilder
      v-else
      ref="listViewRef"
      :options="options"
      @row-click="
        (row) =>
          $router.push({
            name: 'TicketCustomer',
            params: { ticketId: row },
          })
      "
    />
    <ExportModal
      v-model="showExportModal"
      :rowCount="$refs.listViewRef?.list?.data?.total_count ?? 0"
      @update="
        ({ export_type, export_all }) => exportRows(export_type, export_all)
      "
    />
    <ViewModal
      v-if="viewDialogConfig.show"
      v-model="viewDialogConfig"
      @update="onViewModalUpdate"
    />
    <BulkReplyModal
      v-model="showBulkReplyModal"
      :selections="listSelections"
      @success="listViewRef?.unselectAll()"
    />
  </div>
</template>

<script setup lang="ts">
import { LayoutHeader, ListViewBuilder } from "@/components";
import { TicketIcon } from "@/components/icons";
import IndicatorIcon from "@/components/icons/IndicatorIcon.vue";
import BulkReplyModal from "@/components/ticket-agent/BulkReplyModal.vue";
import ExportModal from "@/components/ticket/ExportModal.vue";
import ViewBreadcrumbs from "@/components/ViewBreadcrumbs.vue";
import { normalizeFilters } from "@/components/view-controls/filter";
import ViewModal from "@/components/ViewModal.vue";
import { disableShortcuts } from "@/composables/shortcuts";
import { useLayoutPreference } from "@/composables/useLayoutPreference";
import { useSocketEvent } from "@/composables/useSocketEvent";
import { currentView, useView } from "@/composables/useView";
import { useAuthStore } from "@/stores/auth";
import { globalStore } from "@/stores/globalStore";
import { useTicketStatusStore } from "@/stores/ticketStatus";
import { __ } from "@/translation";
import { View } from "@/types";
import { isCustomerPortal, shortDuration } from "@/utils";
import { useEventListener } from "@vueuse/core";
import { Badge, dayjs, Tooltip, usePageMeta } from "frappe-ui";
import { computed, h, onMounted, onScopeDispose, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import LayoutToggle from "@/components/LayoutToggle.vue";
import LucideAlignJustify from "~icons/lucide/align-justify";

const router = useRouter();
const route = useRoute();

const { splitView } = useLayoutPreference();
// A ticket detail child is active (nested route on desktop agent).
const hasTicketOpen = computed(() => route.name === "TicketAgent");

// Arrow keys walk the list while a pane ticket is open (split view, flat views
// only — grouped views render in a different order than the flat data).
function navigateRow(delta: number) {
  const data = listViewRef.value?.list?.data;
  if (!data?.data?.length || data.view_type === "group_by") return false;
  const names = data.data.map((r) => String(r.name));
  const next = names[names.indexOf(String(route.params.ticketId)) + delta];
  if (!next) return false;
  router.push({
    name: "TicketAgent",
    params: { ticketId: next },
    query: { view: route.query.view },
  });
  return true;
}
useEventListener(document, "keydown", (e: KeyboardEvent) => {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  if (!splitView.value || !hasTicketOpen.value || isCustomerPortal.value) return;
  if (disableShortcuts()) return; // typing / modal / menu — leave arrows alone
  if (navigateRow(e.key === "ArrowDown" ? 1 : -1)) e.preventDefault();
});

const {
  getCurrentUserViews,
  publicViews,
  pinnedViews,
  findView,
  standardViews,
  viewActions,
  handleView,
  resetViewDialog,
} = useView("HD Ticket");

const activeView = computed(() => findView(route.query.view as string).value);
const hasActiveFilters = computed(
  () => Object.keys(listViewRef.value?.list?.params?.filters || {}).length > 0
);

const { $socket } = globalStore();
const { isManager, userId } = useAuthStore();

const listViewRef = ref(null);
const showExportModal = ref(false);

const { getStatus } = useTicketStatusStore();

const listSelections = ref(new Set());

const showBulkReplyModal = ref(false);

const selectBannerActions = [
  {
    label: __("Bulk Reply"),
    icon: "corner-up-left",
    onClick: (selections: Set<string>) => {
      listSelections.value = new Set(selections);
      showBulkReplyModal.value = true;
    },
  },
  {
    label: __("Export"),
    icon: "lucide-download",
    onClick: (selections: Set<string>) => {
      listSelections.value = new Set(selections);
      showExportModal.value = true;
    },
  },
];

const options = computed(() => ({
  doctype: "HD Ticket",
  // 420px split pane: keep id + subject + status (dot renderer) so triage
  // context survives without opening each ticket.
  compact: splitView.value && hasTicketOpen.value,
  compactColumns: { name: "60px", subject: "minmax(0, 1fr)", status: "110px" },
  columnConfig: {
    subject: {
      custom: ({ row, item }) => {
        const seenBy = row._seen ? JSON.parse(row._seen) : [];
        const isSeen = seenBy.includes(userId || "");
        return h(
          "span",
          {
            class: ["truncate flex-1", !isSeen && "font-semibold"],
          },
          item
        );
      },
    },
    _last_message: {
      custom: ({ row }) => {
        const lm = row._last_message;
        if (!lm?.text) return h("span");
        return h("div", { class: "flex items-center gap-1.5 min-w-0 flex-1" }, [
          ...(lm.incoming
            ? [h(IndicatorIcon, { class: "text-blue-500 shrink-0" })]
            : []),
          h(
            "span",
            {
              class: ["truncate flex-1 text-base", lm.incoming && "font-semibold"],
            },
            lm.incoming ? lm.text : `${__("You")}: ${lm.text}`
          ),
        ]);
      },
    },
    status: {
      custom: ({ item }) => {
        const status = getStatus(item);
        const label = isCustomerPortal.value
          ? status?.["label_customer"]
          : status?.["label_agent"];
        return h(
          "div",
          { class: "flex items-center gap-1.5 justify-start w-full" },
          [
            h(IndicatorIcon, { class: status?.["parsed_color"] }),
            h("span", { class: "truncate flex-1 text-base" }, label),
          ]
        );
      },
    },
    agreement_status: {
      custom: ({ item }) => {
        return h(Badge, {
          label: __(item),
          theme: slaStatusColorMap[item],
          variant: "subtle",
        });
      },
    },
    response_by: {
      custom: ({ row, item }) => handleResponseByField(row, item),
    },
    resolution_by: {
      custom: ({ row, item }) => handleResolutionByField(row, item),
    },
  },
  isCustomerPortal: isCustomerPortal.value,
  selectable: true,
  showSelectBanner: true,
  selectBannerActions,
  emptyState: {
    title: __("No tickets found"),
    icon: h(TicketIcon, {
      class: "h-10 w-10",
    }),
    description:
      activeView.value?.public || activeView.value?.pinned
        ? __(
            "No tickets found for this view. Try adjusting your filters or creating a new view."
          )
        : hasActiveFilters.value
        ? __(
            "No tickets found for the applied filters. Try adjusting or clearing your filters."
          )
        : undefined,
  },
  rowRoute: {
    name: isCustomerPortal.value ? "TicketCustomer" : "TicketAgent",
    prop: "ticketId",
  },
  hideColumnSetting: false,
}));

function handleResponseByField(row: any, item: string) {
  if (!row.first_responded_on && dayjs(item).isBefore(new Date())) {
    return h(Badge, {
      label: __("Failed"),
      theme: "red",
      variant: "subtle",
    });
  }
  if (row.first_responded_on && dayjs(row.first_responded_on).isBefore(item)) {
    return h(Badge, {
      label: __("Fulfilled"),
      theme: "gray",
      variant: "subtle",
    });
  } else if (dayjs(row.first_responded_on).isAfter(item)) {
    return h(Badge, {
      label: __("Failed"),
      theme: "red",
      variant: "subtle",
    });
  } else {
    return h(
      Tooltip,
      {
        text: dayjs(item).format("LLLL"),
      },
      h(Badge, {
        label: shortDuration(item),
        variant: "subtle",
        theme: "orange",
      })
    );
  }
}

function handleResolutionByField(row: any, item: string) {
  const status = getStatus(row.status) || {};
  if (status.category === "Paused") {
    return h(Badge, {
      label: __("Paused"),
      theme: "blue",
      variant: "subtle",
    });
  }
  if (row.resolution_date) {
    const fulfilled = dayjs(row.resolution_date).isBefore(
      dayjs(row.resolution_by)
    );
    return h(Badge, {
      label: fulfilled ? __("Fulfilled") : __("Failed"),
      theme: fulfilled ? "gray" : "red",
      variant: "subtle",
    });
  }
  // In progress but the resolution deadline has already passed.
  if (dayjs(item).isBefore(dayjs())) {
    return h(Badge, {
      label: __("Failed"),
      theme: "red",
      variant: "subtle",
    });
  }
  // In progress with a future deadline: show the live countdown.
  return h(
    Tooltip,
    {
      text: dayjs(item).format("LLLL"),
    },
    h(Badge, {
      label: shortDuration(item),
      variant: "subtle",
      theme: "orange",
    })
  );
}

async function exportRows(
  export_type: "CSV" | "Excel" = "Excel",
  export_all: boolean = false
) {
  const list = listViewRef.value?.list;
  if (!list) return;

  const fields = JSON.stringify(list.data.columns.map((f) => f.key));
  const order_by = list.params.order_by;

  // Resolve `@me` filters to the current session user before export
  const resolveAtMe = (entry: any) => {
    if (Array.isArray(entry)) return entry.map(resolveAtMe);
    if (entry === "@me") return userId;
    if (entry === "%@me%") return `%${userId}%`;
    return entry;
  };
  const conditions = normalizeFilters(list.params.filters).map(
    ([field, operator, value]) => [field, operator, resolveAtMe(value)]
  );
  let pageLength: number;

  if (export_all) {
    pageLength = list.data.total_count;
  } else {
    pageLength = listSelections.value.size;
    conditions.push(["name", "in", Array.from(listSelections.value)]);
  }
  const filters = JSON.stringify(conditions);

  window.location.href = `/api/method/frappe.desk.reportview.export_query?file_format_type=${export_type}&title=HD Ticket&doctype=HD Ticket&fields=${fields}&filters=${encodeURIComponent(
    filters
  )}&order_by=${order_by}&page_length=${pageLength}&start=0&view=Report&with_comment_count=1`;
  reset();
  showExportModal.value = false;
}

function reset(reload = false) {
  listViewRef.value?.unselectAll();
  listSelections.value?.clear();
  if (reload) listViewRef.value.reload();
}

const slaStatusColorMap = {
  Fulfilled: "gray",
  Failed: "red",
  "Resolution Due": "orange",
  "First Response Due": "orange",
  Paused: "blue",
};

let viewDialogConfig = reactive({
  show: false,
  view: {
    label: "",
    icon: "",
    name: "",
  },
  mode: "create",
});

const dropdownOptions = computed(() => {
  const items = [
    {
      group: __("Default Views"),
      items: [
        {
          label: __("List View"),
          icon: "lucide-align-justify",
          onClick: () =>
            router.push({
              name: isCustomerPortal.value ? "TicketsCustomer" : "TicketsAgent",
            }),
        },
      ],
    },
  ];

  // Saved Views
  if (getCurrentUserViews.value?.length !== 0) {
    items.push({
      group: __("Saved Views"),
      items: parseViews(getCurrentUserViews.value),
    });
  }
  if (pinnedViews.value?.length !== 0) {
    items.push({
      group: __("Private Views"),
      items: parseViews(pinnedViews.value),
    });
  }

  const allPublicViews = [
    ...(standardViews.value || []),
    ...(publicViews.value || []),
  ];

  const uniquePublicViews = Array.from(
    new Map(allPublicViews.map((v) => [v.name, v])).values()
  );

  items.push({
    group: __("Public Views"),
    items: parseViews(uniquePublicViews),
  });

  items.push({
    group: __("Create View"),
    hideLabel: true,
    items: [
      {
        label: __("Create View"),
        icon: "lucide-plus",
        onClick: () => {
          resetViewDialog(viewDialogConfig);
          viewDialogConfig.show = true;
        },
      },
    ],
  });

  return items;
});

function parseViews(views: View[]) {
  return views?.map((view) => {
    return {
      ...view,
      onClick: () => {
        currentView.value = {
          label: view.label,
          icon: view.icon,
        };
        router.push({
          name: view.route_name,
          query: {
            view: view.name,
          },
        });
      },
    };
  });
}

function onViewModalUpdate(viewInfo: any, action: string) {
  handleView(viewInfo, action, viewDialogConfig, () => listViewRef.value?.list);
}

if (!isCustomerPortal.value) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const debouncedReload = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => listViewRef.value?.reload(), 500);
  };

  useSocketEvent("helpdesk:new-ticket", () => listViewRef.value?.reload());
  $socket.emit("doctype_subscribe", "HD Ticket");
  useSocketEvent("connect", () => $socket.emit("doctype_subscribe", "HD Ticket"));
  useSocketEvent("list_update", (data: { doctype?: string }) => {
    if (data?.doctype === "HD Ticket") debouncedReload();
  });
  onScopeDispose(() => $socket.emit("doctype_unsubscribe", "HD Ticket"));
}

onMounted(() => {
  if (!route.query.view) {
    currentView.value = {
      label: __("List"),
      icon: LucideAlignJustify,
    };
  }
});

usePageMeta(() => {
  // Depend on route.name so closing the detail pane (name flips back to the list)
  // re-applies the list title instead of leaving the ticket's.
  route.name;
  return {
    title: __("Tickets"),
  };
});
</script>

<style scoped>
/* Rows are router-links (ListRow getRowRoute), so the ticket open in the detail
   pane gets router-link-active for free — mark it so agents can see which row
   is loaded while triaging in split view. */
.agent-ticket-list :deep(a.router-link-active) {
  @apply bg-surface-gray-2;
  box-shadow: inset 2px 0 0 0 var(--text-ink-gray-7);
}

/* frappe-ui ListView sizes its inner container to content (w-max) for wide
   column sets; in the 420px compact pane force it to fit so the subject's
   minmax(0,1fr) track shrinks instead of overflowing off-pane. */
.agent-ticket-list.compact :deep(.w-max.min-w-full) {
  width: 100%;
}
</style>

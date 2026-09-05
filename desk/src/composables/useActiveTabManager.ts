import { useTelephonyStore } from "@/stores/telephony";
import { storeToRefs } from "pinia";
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

// Anchor hashes from notifications/search (#comment-<name>,
// #communication-<name>) belong to a tab but must keep their hash so
// TicketAgentActivities can scroll to the anchor — never rewrite them.
export const ANCHOR_TAB = { comment: "comment", communication: "email" };

export function useActiveTabManager(tabs) {
  const route = useRoute();
  const router = useRouter();
  const telephonyStore = useTelephonyStore();
  const { isLoading: isTelephonyLoading } = storeToRefs(telephonyStore);

  const changeTabTo = (tab) => {
    tabIndex.value = tab;
    if (tab == 0) {
      router.replace({ path: route.path, query: route.query });
    } else {
      setActiveTabInUrl(tabs.value?.[tab]?.name || tabs.value[0].name);
    }
  };

  function setActiveTabInUrl(tabName) {
    let hash = "#" + tabName?.toLowerCase();
    if (route.hash === hash) return;
    router.push({ hash, query: route.query });
  }

  function findTabIndex(tabName) {
    return tabs.value?.findIndex(
      (tabOptions) => tabOptions.name.toLowerCase() === tabName
    );
  }

  function resolveTabIndex(hashName) {
    const exact = findTabIndex(hashName);
    if (exact !== -1) return { index: exact, exact: true };
    const anchorTab = ANCHOR_TAB[hashName.split("-")[0]];
    return { index: anchorTab ? findTabIndex(anchorTab) : -1, exact: false };
  }

  const tabIndex = ref(0);

  const setActiveTab = () => {
    let _activeTab = route.hash.replace("#", "");
    if (_activeTab) {
      let { index, exact } = resolveTabIndex(_activeTab);
      if (index !== -1) {
        tabIndex.value = index;
        if (exact) setActiveTabInUrl(tabs.value[index].name);
        return;
      }
    }

    tabIndex.value = 0;
    // ponytail: keep an unresolved hash — channel tabs load async and the tabs
    // watcher resolves it on the next update (immediate:true runs before they exist).
    if (!_activeTab) router.replace({ path: route.path, query: route.query });
  };

  // Handle when page is navigated
  watch(
    () => route.hash,
    (newHash) => {
      let { index } = resolveTabIndex(newHash.replace("#", ""));
      if (index === -1) index = 0;

      if (index == 0) {
        router.replace({ path: route.path, query: route.query });
      }

      tabIndex.value = index;
    }
  );

  // Handle when tabs array is updated. `immediate` also applies the URL hash
  // when the panel remounts on soft navigation between tickets.
  watch(
    [tabs, isTelephonyLoading],
    ([tabsValue, isLoading]) => {
      if (!tabsValue?.length) return;
      if (!isLoading) {
        setActiveTab();
      }
    },
    { deep: true, flush: "post", immediate: true }
  );

  return { tabIndex, changeTabTo };
}

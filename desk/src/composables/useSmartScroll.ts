import { ref, nextTick, type Ref } from "vue";
import { useEventListener } from "@vueuse/core";

// ponytail: fixed px threshold for "near bottom"; tune if tall media rows feel off
const THRESHOLD = 100;

export function useSmartScroll(el: Ref<HTMLElement | null | undefined>) {
  const atBottom = ref(true); // live; scroll events don't fire on DOM growth, so at
                              // content-change time this IS the pre-growth value
  const showPill = ref(false);

  // The anchored div isn't always the real scroller (mobile layouts scroll an
  // ancestor page wrapper); resolve lazily to the nearest overflowing scrollable.
  function scroller(): HTMLElement | null {
    let e: HTMLElement | null = el.value ?? null;
    while (e) {
      if (
        e.scrollHeight > e.clientHeight + 1 &&
        /(auto|scroll)/.test(getComputedStyle(e).overflowY)
      ) {
        return e;
      }
      e = e.parentElement;
    }
    return null;
  }

  function check() {
    const e = scroller();
    if (!e) return;
    atBottom.value = e.scrollTop + e.clientHeight >= e.scrollHeight - THRESHOLD;
    if (atBottom.value) showPill.value = false; // dismisses when user reaches the message
  }
  function scrollToBottom(smooth = false) {
    showPill.value = false;
    const e = scroller();
    if (!e) return;
    e.scrollTo({ top: e.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }
  function onNewContent() {
    if (atBottom.value) nextTick(() => scrollToBottom());
    else showPill.value = true;
  }
  // Scroll events don't bubble, but they do propagate in the capture phase —
  // one document listener covers whichever ancestor turns out to scroll.
  useEventListener(document, "scroll", check, { capture: true, passive: true });
  return { showPill, scrollToBottom, onNewContent };
}

import { globalStore } from "@/stores/globalStore";
import { onScopeDispose } from "vue";

// Register a single named socket handler and remove exactly that handler on scope
// dispose. Never blanket-off — that clobbers other components listening on the same
// event (fatal once list + detail mount at once in the split view).
export function useSocketEvent(event: string, handler: (...args: any[]) => void) {
  const { $socket } = globalStore();
  $socket.on(event, handler);
  onScopeDispose(() => $socket.off(event, handler));
}

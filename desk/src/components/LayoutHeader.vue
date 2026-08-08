<template>
  <Teleport to="#app-header" :disabled="inline" v-if="showHeader">
    <slot>
      <!-- Inline (split pane): auto height + top alignment so the right-side
           controls line up with the breadcrumb row, not the center of the
           breadcrumb+SLA block. Teleported: baseline classes + explicit order. -->
      <header
        class="flex justify-between mx-4 md:ms-5 md:me-0"
        :class="inline ? 'mt-2 shrink-0 items-start' : 'h-10.5 items-center order-1'"
      >
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <slot name="left-header" />
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <slot name="right-header" class="flex items-center gap-2" />
        </div>
      </header>
    </slot>
  </Teleport>
</template>
<script setup>
import { nextTick, ref } from "vue";

// When `inline`, render in place instead of teleporting to the global #app-header
// (split view keeps the header inside the ticket pane).
defineProps({
  inline: {
    type: Boolean,
    default: false,
  },
});

const showHeader = ref(false);

nextTick(() => {
  showHeader.value = true;
});
</script>

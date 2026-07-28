<template>
  <div class="w-full px-6 md:px-5 grid grid-cols-[30px_minmax(auto,_1fr)] gap-2 sm:gap-4 mb-2">
    <div class="relative flex justify-center" />
    <div class="flex items-center gap-2 text-sm text-ink-gray-5 py-1">
      <span class="text-p-sm text-ink-gray-6">{{ label }}</span>
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<style scoped>
.typing-dots {
  display: inline-flex;
  gap: 2px;
  align-items: center;
}

.typing-dots span {
  height: 4px;
  width: 4px;
  background-color: #6b7280;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing {
  0%,
  80%,
  100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .typing-dots span {
    animation: none;
    opacity: 0.7;
  }
}
</style>

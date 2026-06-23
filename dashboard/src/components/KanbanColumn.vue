<script setup lang="ts">
import Badge from './Badge.vue';

defineProps<{
  title: string;
  count: number;
  badgeVariant?: 'success' | 'warning' | 'error' | 'info' | 'default';
}>();
</script>

<template>
  <div class="flex-shrink-0 w-80 bg-gray-50/50 border border-gray-200 rounded-lg flex flex-col max-h-full">
    <div class="p-4 border-b border-gray-200 flex items-center justify-between bg-white rounded-t-lg">
      <h3 class="font-medium text-gray-900">{{ title }}</h3>
      <Badge :variant="badgeVariant || 'default'">{{ count }}</Badge>
    </div>
    <div class="p-3 flex-1 overflow-y-auto space-y-3">
      <slot></slot>
    </div>
  </div>
</template>

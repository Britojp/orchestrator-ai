<script setup lang="ts">
import { computed } from 'vue';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

const props = withDefaults(defineProps<{
  variant?: BadgeVariant;
  status?: string;
}>(), {
  variant: 'default',
});

const computedVariant = computed<BadgeVariant>(() => {
  if (props.status) {
    switch (props.status.toLowerCase()) {
      case 'done':
      case 'completed':
        return 'success';
      case 'in_progress':
      case 'running':
        return 'info';
      case 'failed':
        return 'error';
      case 'pending':
      case 'planned':
      case 'draft':
        return 'warning';
      default:
        return 'default';
    }
  }
  return props.variant;
});

const classes = computed(() => {
  const variants: Record<BadgeVariant, string> = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    default: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[computedVariant.value]}`;
});

const displayStatus = computed(() => {
  if (props.status) {
    return props.status.replace('_', ' ').toUpperCase();
  }
  return '';
});
</script>

<template>
  <span :class="classes">
    <template v-if="status">{{ displayStatus }}</template>
    <slot v-else></slot>
  </span>
</template>

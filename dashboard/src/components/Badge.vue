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
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    default: 'bg-primary-100 text-primary-700 border-primary-200'
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

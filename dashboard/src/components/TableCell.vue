<script setup lang="ts">
defineProps<{
  align?: 'left' | 'center' | 'right';
  colSpan?: number;
}>();
</script>

<template>
  <td :colspan="colSpan" :class="[
    'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  ]">
    <slot></slot>
  </td>
</template>

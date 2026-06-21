<script setup lang="ts">
defineProps<{
  align?: 'left' | 'center' | 'right';
}>();
</script>

<template>
  <th :class="[
    'px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider',
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  ]">
    <slot></slot>
  </th>
</template>

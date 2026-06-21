<script setup lang="ts">
import { useSlots } from 'vue';

defineProps<{
  title?: string;
}>();

const slots = useSlots();
</script>

<template>
  <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
    <div v-if="title || slots.title" class="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
      <slot name="title">
        <h3 v-if="title" class="text-lg font-medium text-gray-900">{{ title }}</h3>
      </slot>
    </div>
    <div class="px-6 py-4">
      <slot></slot>
    </div>
    <div v-if="slots.footer" class="px-6 py-4 border-t border-gray-200 bg-gray-50">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  role: 'user' | 'assistant' | 'system' | 'execution';
  content: string;
}>();

const align = computed(() => {
  if (props.role === 'user') return 'ml-auto';
  if (props.role === 'system' || props.role === 'execution') return 'mx-auto';
  return 'mr-auto';
});

const wrapperClasses = computed(() => {
  if (align.value === 'ml-auto') return 'justify-end';
  if (align.value === 'mx-auto') return 'justify-center';
  return 'justify-start';
});

const innerClasses = computed(() => {
  let bgColor = 'bg-white';
  let textColor = 'text-gray-900';
  let border = 'border border-gray-200';
  let extra = '';

  if (props.role === 'user') {
    bgColor = 'bg-primary-600';
    textColor = 'text-white';
    border = '';
  } else if (props.role === 'system') {
    bgColor = 'bg-gray-100';
    textColor = 'text-gray-500';
    border = 'border-dashed border-gray-300';
  } else if (props.role === 'execution') {
    bgColor = 'bg-slate-800';
    textColor = 'text-green-400 font-mono text-sm';
    extra = 'w-full max-w-full rounded-md p-4';
  }

  return `max-w-[80%] rounded-2xl px-5 py-3 ${bgColor} ${textColor} ${border} ${extra}`;
});
</script>

<template>
  <div class="flex w-full mb-4" :class="wrapperClasses">
    <div :class="innerClasses">
      <div class="whitespace-pre-wrap">{{ content }}</div>
    </div>
  </div>
</template>

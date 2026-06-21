<script setup lang="ts">
import { computed } from 'vue';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

const props = withDefaults(defineProps<{
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}>(), {
  variant: 'primary',
  size: 'md',
  fullWidth: false,
  type: 'button',
  disabled: false
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>();

const classes = computed(() => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-primary-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
  };

  const sizes: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return [
    baseClasses,
    variants[props.variant],
    sizes[props.size],
    props.fullWidth ? 'w-full' : ''
  ].filter(Boolean).join(' ');
});
</script>

<template>
  <button
    :type="type"
    :class="classes"
    :disabled="disabled"
    @click="(e) => emit('click', e)"
  >
    <slot></slot>
  </button>
</template>

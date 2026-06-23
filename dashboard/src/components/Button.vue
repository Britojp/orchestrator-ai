<script setup lang="ts">
import { computed } from 'vue';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
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
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-button transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent shadow-subtle';

  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-primary-950 text-white hover:bg-primary-800 focus:ring-primary-950',
    secondary: 'bg-white text-primary-950 border-primary-200 hover:bg-primary-50 focus:ring-primary-200',
    ghost: 'bg-transparent text-primary-600 hover:bg-primary-100 hover:text-primary-900 focus:ring-primary-200 shadow-none'
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

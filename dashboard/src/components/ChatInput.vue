<script setup lang="ts">
import { ref } from 'vue';
import { Send } from 'lucide-vue-next';
import Button from './Button.vue';

const props = defineProps<{
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'sendMessage', message: string): void;
}>();

const message = ref('');

import { nextTick, ref as vueRef } from 'vue';

const textareaRef = vueRef<HTMLTextAreaElement | null>(null);

const adjustHeight = async () => {
  await nextTick();
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto';
    textareaRef.value.style.height = `${Math.min(textareaRef.value.scrollHeight, 200)}px`;
  }
};

const handleSubmit = () => {
  if (message.value.trim() && !props.isLoading) {
    emit('sendMessage', message.value.trim());
    message.value = '';
    adjustHeight();
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
};
</script>

<template>
  <form @submit.prevent="handleSubmit" class="relative flex flex-col bg-white border border-gray-300 rounded-2xl shadow-sm p-3 focus-within:ring-2 focus-within:ring-primary-950 focus-within:border-transparent transition-shadow">
    <textarea
      ref="textareaRef"
      v-model="message"
      @input="adjustHeight"
      placeholder="Ask Claude or type '/' for commands..."
      class="block w-full resize-none bg-transparent border-0 p-2 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6 min-h-[44px] max-h-[200px]"
      rows="1"
      @keydown="handleKeyDown"
    ></textarea>
    <div class="flex justify-between items-center mt-2 pl-2 pr-1">
      <div class="text-[10px] text-gray-400">
        <span class="hidden sm:inline">Use <kbd class="font-sans px-1 bg-gray-100 rounded border border-gray-200">Shift</kbd> + <kbd class="font-sans px-1 bg-gray-100 rounded border border-gray-200">Enter</kbd> for a new line</span>
      </div>
      <Button
        type="submit"
        :disabled="!message.trim() || isLoading"
        size="sm"
        class="rounded-full w-8 h-8 p-0 flex items-center justify-center transition-all bg-primary-950 text-white disabled:bg-gray-200 disabled:text-gray-400"
      >
        <Send class="w-4 h-4" />
      </Button>
    </div>
  </form>
</template>

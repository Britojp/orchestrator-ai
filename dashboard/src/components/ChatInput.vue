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

const handleSubmit = () => {
  if (message.value.trim() && !props.isLoading) {
    emit('sendMessage', message.value.trim());
    message.value = '';
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
  <form @submit.prevent="handleSubmit" class="relative flex items-center bg-white border border-gray-300 rounded-lg shadow-sm p-2 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
    <textarea
      v-model="message"
      placeholder="Type a message to the AI agent..."
      class="block w-full resize-none bg-transparent border-0 py-2 px-3 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
      rows="2"
      @keydown="handleKeyDown"
    ></textarea>
    <div class="absolute right-2 bottom-2">
      <Button
        type="submit"
        :disabled="!message.trim() || isLoading"
        size="sm"
        class="rounded-full w-8 h-8 p-0 flex items-center justify-center"
      >
        <Send class="w-4 h-4" />
      </Button>
    </div>
  </form>
</template>

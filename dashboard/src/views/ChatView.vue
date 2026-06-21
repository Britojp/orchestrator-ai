<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import ChatMessage from '../components/ChatMessage.vue';
import ChatInput from '../components/ChatInput.vue';
import Card from '../components/Card.vue';
import { Bot } from 'lucide-vue-next';

interface Message {
  role: 'user' | 'assistant' | 'system' | 'execution';
  content: string;
}

const messages = ref<Message[]>([
  { role: 'system', content: 'Conversation started.' },
  { role: 'assistant', content: 'Hello! I am your AI Development Assistant. What would you like to build today?' }
]);

const isTyping = ref(false);
const messagesContainer = ref<HTMLDivElement | null>(null);

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

watch(messages, scrollToBottom, { deep: true });

const handleSendMessage = (content: string) => {
  messages.value.push({ role: 'user', content });
  isTyping.value = true;

  // Simulate AI response
  setTimeout(() => {
    messages.value.push({
      role: 'assistant',
      content: `I understand you want to: "${content}". I will create a plan for this.`
    });
    isTyping.value = false;
  }, 1000);
};
</script>

<template>
  <div class="max-w-5xl mx-auto h-[calc(100vh-4rem)] p-4 flex flex-col">
    <div class="mb-4">
      <h1 class="text-2xl font-bold text-gray-900">AI Workspace Chat</h1>
      <p class="text-sm text-gray-500">Discuss requirements, review plans, and execute code changes.</p>
    </div>

    <Card class="flex-1 flex flex-col min-h-0 bg-gray-50">
      <div class="flex-1 overflow-y-auto p-4 sm:p-6" ref="messagesContainer">
        <ChatMessage
          v-for="(msg, idx) in messages"
          :key="idx"
          :role="msg.role"
          :content="msg.content"
        />
        <div v-if="isTyping" class="flex items-center gap-2 text-gray-500 text-sm mb-4">
          <Bot class="w-4 h-4 animate-bounce" /> AI is thinking...
        </div>
      </div>

      <div class="p-4 bg-white border-t border-gray-200">
        <ChatInput @sendMessage="handleSendMessage" :isLoading="isTyping" />
      </div>
    </Card>
  </div>
</template>

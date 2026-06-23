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

const messages = ref<Message[]>([]);

const isTyping = ref(false);
const messagesContainer = ref<HTMLDivElement | null>(null);

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

watch(messages, scrollToBottom, { deep: true });

const handleSendMessage = async (content: string) => {
  messages.value.push({ role: 'user', content });
  isTyping.value = true;

  const assistantMessage: Message = { role: 'assistant', content: '' };
  messages.value.push(assistantMessage);

  try {
    const conversationId = 'mock-conversation-id-for-now';
    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content })
    });

    if (!response.body) throw new Error('ReadableStream not supported.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;

    isTyping.value = false; // Stop thinking indicator once stream starts

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '');
            if (dataStr === '[DONE]') break;

            try {
              const data = JSON.parse(dataStr);
              if (data.content) {
                assistantMessage.content += data.content;
                await scrollToBottom();
              }
            } catch (e) {
              console.error('Error parsing SSE JSON:', e);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Streaming error:', err);
    assistantMessage.content += '\n\n**Error:** Failed to stream response.';
  } finally {
    isTyping.value = false;
  }
};
</script>

<template>
  <div class="max-w-5xl mx-auto h-[calc(100vh-4rem)] p-4 flex flex-col">
    <div class="mb-4">
      <h1 class="text-2xl font-bold text-gray-900">AI Workspace Chat</h1>
      <p class="text-sm text-gray-500">Discuss requirements, review plans, and execute code changes.</p>
    </div>

    <Card class="flex-1 flex flex-col min-h-0 bg-gray-50 relative">
      <div v-if="messages.length === 0" class="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <Bot class="w-12 h-12 text-primary-400 mb-4" />
        <h2 class="text-xl font-medium text-primary-900 mb-2">Como posso ajudar você hoje?</h2>
        <div class="grid grid-cols-2 gap-4 mt-6 max-w-md">
          <button @click="handleSendMessage('Analisar arquitetura')" class="text-sm p-3 border border-primary-200 rounded-xl bg-white hover:bg-primary-50 text-primary-600 transition-colors">
            Analisar arquitetura
          </button>
          <button @click="handleSendMessage('Criar funcionalidade')" class="text-sm p-3 border border-primary-200 rounded-xl bg-white hover:bg-primary-50 text-primary-600 transition-colors">
            Criar funcionalidade
          </button>
          <button @click="handleSendMessage('Revisar código')" class="text-sm p-3 border border-primary-200 rounded-xl bg-white hover:bg-primary-50 text-primary-600 transition-colors">
            Revisar código
          </button>
          <button @click="handleSendMessage('Gerar documentação')" class="text-sm p-3 border border-primary-200 rounded-xl bg-white hover:bg-primary-50 text-primary-600 transition-colors">
            Gerar documentação
          </button>
        </div>
      </div>

      <div v-else class="flex-1 overflow-y-auto p-4 sm:p-6" ref="messagesContainer">
        <!-- Container estruturado para futura virtualização (react-virtual / tanstack virtual) -->
        <div class="flex flex-col space-y-4">
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
      </div>

      <div class="p-4 bg-white border-t border-gray-200 z-10">
        <ChatInput @sendMessage="handleSendMessage" :isLoading="isTyping" />
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

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

const parsedHtml = ref('');

const parseMarkdown = async () => {
  if (props.role === 'user' || props.role === 'system' || props.role === 'execution') {
    return;
  }

  // Override marked renderer for custom code blocks
  const renderer = new marked.Renderer();
  renderer.code = (options: { text: string; lang?: string }) => {
    const lang = options.lang || 'text';
    const text = options.text;

    return `
      <div class="my-4 rounded-md overflow-hidden border border-gray-200 bg-gray-900 text-gray-100">
        <div class="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 text-xs font-mono">
          <span>${lang}</span>
          <div class="flex gap-3">
            <button data-action="copy" data-code="${encodeURIComponent(text)}" class="hover:text-white text-gray-400 transition-colors">Copy</button>
            <button data-action="collapse" class="hover:text-white text-gray-400 transition-colors">Collapse</button>
          </div>
        </div>
        <pre class="p-4 overflow-x-auto text-sm"><code>${text}</code></pre>
      </div>
    `;
  };

  marked.setOptions({ renderer });

  const rawHtml = await marked(props.content);
  parsedHtml.value = DOMPurify.sanitize(rawHtml);
};

const handleAction = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target) return;

  const action = target.getAttribute('data-action');

  if (action === 'copy') {
    const code = target.getAttribute('data-code');
    if (code) {
      navigator.clipboard.writeText(decodeURIComponent(code));
    }
  } else if (action === 'collapse') {
    const pre = target.parentElement?.parentElement?.nextElementSibling;
    if (pre && pre.tagName === 'PRE') {
      pre.classList.toggle('hidden');
    }
  }
};

watch(() => props.content, parseMarkdown);
onMounted(parseMarkdown);
</script>

<template>
  <div class="flex w-full mb-4" :class="wrapperClasses">
    <div :class="innerClasses">
      <div v-if="role === 'user' || role === 'system' || role === 'execution'" class="whitespace-pre-wrap">{{ content }}</div>
      <div v-else class="markdown-body prose prose-sm max-w-none" v-html="parsedHtml" @click="handleAction"></div>
    </div>
  </div>
</template>

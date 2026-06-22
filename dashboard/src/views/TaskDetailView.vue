<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { Task } from '../types';
import Badge from '../components/Badge.vue';
import Card from '../components/Card.vue';
import Button from '../components/Button.vue';
import { ArrowLeft, ExternalLink, RefreshCw, GitBranch, AlertCircle, Clock } from 'lucide-vue-next';
import { format } from 'date-fns';

const route = useRoute();
const id = ref(route.params.id as string);

const task = ref<Task | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

let pollInterval: ReturnType<typeof setInterval>;

const fetchTask = async () => {
  if (!id.value) return;

  try {
    loading.value = true;
    error.value = null;
    const response = await fetch(`/api/tasks/${id.value}`);
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    const data = await response.json();
    task.value = data;
  } catch (err: any) {
    error.value = err.message || 'Failed to fetch task details';
    console.error('Error fetching task:', err);
  } finally {
    loading.value = false;
  }
};

const setupSubscription = () => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }

  if (!id.value) return;

  pollInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/tasks/${id.value}`);
      if (response.ok) {
        task.value = await response.json();
      }
    } catch (e) {
      console.error('Polling error', e);
    }
  }, 5000);
};

onMounted(() => {
  fetchTask();
  setupSubscription();
});

watch(() => route.params.id, (newId) => {
  if (newId && typeof newId === 'string') {
    id.value = newId;
    fetchTask();
    setupSubscription();
  }
});

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
});
</script>

<template>
  <div v-if="loading && !task" class="flex items-center justify-center min-h-[50vh]">
    <RefreshCw class="w-8 h-8 animate-spin text-primary-500" />
  </div>

  <div v-else-if="error || !task" class="max-w-4xl mx-auto px-4 py-8">
    <RouterLink to="/">
      <Button variant="ghost" class="mb-4 gap-2">
        <ArrowLeft class="w-4 h-4" />
        Back to Dashboard
      </Button>
    </RouterLink>
    <Card class="border-red-200">
      <div class="p-6 text-center text-red-600">
        <AlertCircle class="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h2 class="text-lg font-medium mb-2">Error Loading Task</h2>
        <p>{{ error || 'Task not found' }}</p>
      </div>
    </Card>
  </div>

  <div v-else class="max-w-4xl mx-auto px-4 py-8">
    <RouterLink to="/">
      <Button variant="ghost" class="mb-6 gap-2">
        <ArrowLeft class="w-4 h-4" />
        Back to Dashboard
      </Button>
    </RouterLink>

    <div class="flex items-start justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">{{ task.title }}</h1>
        <div class="flex items-center gap-4 text-sm text-gray-500">
          <span class="font-mono">{{ task.id }}</span>
          <span>•</span>
          <div class="flex items-center gap-1">
            <Clock class="w-4 h-4" />
            {{ task.created_at ? format(new Date(task.created_at), 'MMM d, yyyy HH:mm') : '-' }}
          </div>
        </div>
      </div>
      <Badge :status="task.status" />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <Card class="col-span-1 md:col-span-2">
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Description</h3>
          <div class="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap mb-8">
            {{ task.description }}
          </div>

          <h3 class="text-lg font-medium text-gray-900 mb-4">Acceptance Criteria</h3>
          <div class="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap bg-gray-50 p-4 rounded-md border border-gray-100">
            {{ task.acceptance_criteria }}
          </div>
        </div>
      </Card>

      <div class="space-y-6">
        <Card title="Execution Details">
          <div class="space-y-4">
            <div v-if="task.pr_url">
              <div class="text-sm font-medium text-gray-500 mb-1">Pull Request</div>
              <a
                :href="task.pr_url"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 hover:underline"
              >
                #{{ task.pr_number || 'Link' }} <ExternalLink class="w-3 h-3" />
              </a>
            </div>

            <div v-if="task.branch_name">
              <div class="text-sm font-medium text-gray-500 mb-1">Branch</div>
              <div class="inline-flex items-center gap-2 text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded font-mono">
                <GitBranch class="w-3 h-3" />
                {{ task.branch_name }}
              </div>
            </div>

            <div>
              <div class="text-sm font-medium text-gray-500 mb-1">Retries</div>
              <div class="text-sm text-gray-900">{{ task.retry_count }}</div>
            </div>

            <div v-if="task.started_at">
              <div class="text-sm font-medium text-gray-500 mb-1">Started At</div>
              <div class="text-sm text-gray-900">
                {{ format(new Date(task.started_at), 'MMM d, yyyy HH:mm:ss') }}
              </div>
            </div>

            <div v-if="task.completed_at">
              <div class="text-sm font-medium text-gray-500 mb-1">Completed At</div>
              <div class="text-sm text-gray-900">
                {{ format(new Date(task.completed_at), 'MMM d, yyyy HH:mm:ss') }}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>

    <Card v-if="task.error_message" class="border-red-200 bg-red-50 mb-6">
      <div class="p-6">
        <div class="flex items-center gap-2 text-red-800 font-medium mb-2">
          <AlertCircle class="w-5 h-5" />
          Error Message
        </div>
        <pre class="text-sm text-red-700 whitespace-pre-wrap font-mono overflow-x-auto">
          {{ task.error_message }}
        </pre>
      </div>
    </Card>
  </div>
</template>

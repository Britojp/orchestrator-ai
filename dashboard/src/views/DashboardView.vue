<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { Task } from '../types';
import Table from '../components/Table.vue';
import TableHead from '../components/TableHeader.vue';
import TableRow from '../components/TableRow.vue';
import TableCell from '../components/TableCell.vue';
import Badge from '../components/Badge.vue';
import Button from '../components/Button.vue';
import Card from '../components/Card.vue';
import { format } from 'date-fns';
import { Eye, RefreshCw } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';

const tasks = ref<Task[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const fetchTasks = async () => {
  try {
    loading.value = true;
    error.value = null;
    const response = await fetch('/api/tasks');
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    const data = await response.json();
    tasks.value = data || [];
  } catch (err: any) {
    error.value = err.message || 'Failed to fetch tasks';
    console.error('Error fetching tasks:', err);
  } finally {
    loading.value = false;
  }
};

let pollInterval: ReturnType<typeof setInterval>;

onMounted(() => {
  fetchTasks();
  pollInterval = setInterval(fetchTasks, 5000);
});

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Orchestrator Tasks</h1>
        <p class="mt-1 text-sm text-gray-500">Monitor and manage AI agent execution tasks.</p>
      </div>
      <Button @click="fetchTasks" variant="secondary" class="gap-2">
        <RefreshCw :class="['w-4 h-4', loading ? 'animate-spin' : '']" />
        Refresh
      </Button>
    </div>

    <Card>
      <div v-if="error" class="p-4 bg-red-50 text-red-700 border-b border-red-100">
        {{ error }}
      </div>

      <Table>
        <template #header>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Created</TableHead>
          <TableHead align="right">Actions</TableHead>
        </template>
        <template #body>
          <TableRow v-if="tasks.length === 0 && !loading">
            <TableCell :colSpan="5" align="center" class="text-gray-500 py-8">
              No tasks found.
            </TableCell>
          </TableRow>
          <TableRow v-else v-for="task in tasks" :key="task.id">
            <TableCell>
              <div class="font-medium text-gray-900">{{ task.title }}</div>
              <div class="text-sm text-gray-500 truncate max-w-md" :title="task.id">
                {{ task.id }}
              </div>
            </TableCell>
            <TableCell>
              <Badge :status="task.status" />
            </TableCell>
            <TableCell>
              {{ task.priority || 0 }}
            </TableCell>
            <TableCell>
              {{ task.created_at ? format(new Date(task.created_at), 'MMM d, yyyy HH:mm') : '-' }}
            </TableCell>
            <TableCell align="right">
              <RouterLink :to="`/tasks/${task.id}`">
                <Button variant="ghost" size="sm" class="gap-2 text-primary-600 hover:text-primary-700">
                  <Eye class="w-4 h-4" />
                  Details
                </Button>
              </RouterLink>
            </TableCell>
          </TableRow>
        </template>
      </Table>
    </Card>
  </div>
</template>

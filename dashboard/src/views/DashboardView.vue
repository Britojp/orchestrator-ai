<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { supabase } from '../lib/supabase';
import type { Task } from '../lib/supabase';
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
    const { data, error: err } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (err) throw err;
    tasks.value = data || [];
  } catch (err: any) {
    error.value = err.message || 'Failed to fetch tasks';
    console.error('Error fetching tasks:', err);
  } finally {
    loading.value = false;
  }
};

let subscription: any;

onMounted(() => {
  fetchTasks();
  subscription = supabase
    .channel('tasks-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
      fetchTasks();
    })
    .subscribe();
});

onUnmounted(() => {
  if (subscription) {
    supabase.removeChannel(subscription);
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

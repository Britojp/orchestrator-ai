<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { supabase } from '../lib/supabase';
import type { Task } from '../lib/supabase';
import KanbanBoard from '../components/KanbanBoard.vue';
import KanbanColumn from '../components/KanbanColumn.vue';
import Card from '../components/Card.vue';
import { Clock } from 'lucide-vue-next';
import { format } from 'date-fns';
import { RouterLink } from 'vue-router';

const tasks = ref<Task[]>([]);
const loading = ref(true);

const fetchTasks = async () => {
  try {
    loading.value = true;
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    tasks.value = data || [];
  } catch (err) {
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

const getTasksByStatus = (status: string) => tasks.value.filter(t => t.status === status);

const columns = [
  { id: 'pending', title: 'Planned', variant: 'warning' as const },
  { id: 'in_progress', title: 'Running', variant: 'info' as const },
  { id: 'done', title: 'Completed', variant: 'success' as const },
  { id: 'failed', title: 'Failed', variant: 'error' as const },
];
</script>

<template>
  <div v-if="loading" class="p-8 text-center text-gray-500">Loading Kanban board...</div>
  <div v-else class="h-[calc(100vh-4rem)] flex flex-col p-4 sm:p-8 overflow-hidden">
    <div class="mb-6 flex-shrink-0">
      <h1 class="text-2xl font-bold text-gray-900">Task Execution Kanban</h1>
      <p class="text-sm text-gray-500 mt-1">Track the execution status of all generated tasks.</p>
    </div>

    <div class="flex-1 overflow-hidden">
      <KanbanBoard>
        <KanbanColumn
          v-for="col in columns"
          :key="col.id"
          :title="col.title"
          :count="getTasksByStatus(col.id).length"
          :badgeVariant="col.variant"
        >
          <RouterLink
            v-for="task in getTasksByStatus(col.id)"
            :key="task.id"
            :to="`/tasks/${task.id}`"
            class="block"
          >
            <Card class="hover:shadow-md transition-shadow cursor-pointer bg-white border-gray-200">
              <div class="p-3">
                <div class="flex justify-between items-start mb-2 gap-2">
                  <h4 class="text-sm font-medium text-gray-900 line-clamp-2">{{ task.title }}</h4>
                </div>
                <div class="flex items-center gap-1 text-xs text-gray-500 mt-3">
                  <Clock class="w-3 h-3" />
                  {{ format(new Date(task.created_at), 'MMM d, HH:mm') }}
                </div>
              </div>
            </Card>
          </RouterLink>
        </KanbanColumn>
      </KanbanBoard>
    </div>
  </div>
</template>

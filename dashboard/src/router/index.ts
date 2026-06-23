import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import ChatView from '../views/ChatView.vue';
import KanbanView from '../views/KanbanView.vue';
import TaskDetailView from '../views/TaskDetailView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: DashboardView
    },
    {
      path: '/chat',
      name: 'chat',
      component: ChatView
    },
    {
      path: '/kanban',
      name: 'kanban',
      component: KanbanView
    },
    {
      path: '/tasks/:id',
      name: 'task-detail',
      component: TaskDetailView
    }
  ]
});

export default router;

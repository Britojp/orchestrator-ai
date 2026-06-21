<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { Bot, LayoutDashboard, KanbanSquare } from 'lucide-vue-next';
import { computed } from 'vue';

const route = useRoute();

const isActive = (path: string) => computed(() =>
  route.path === path ? 'bg-gray-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
).value;
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <nav class="flex space-x-4 border-b border-gray-200 px-4 py-3 bg-white">
      <RouterLink to="/" :class="['flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium', isActive('/')]">
        <LayoutDashboard class="w-4 h-4" />
        Dashboard
      </RouterLink>
      <RouterLink to="/chat" :class="['flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium', isActive('/chat')]">
        <Bot class="w-4 h-4" />
        Chat Workspace
      </RouterLink>
      <RouterLink to="/kanban" :class="['flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium', isActive('/kanban')]">
        <KanbanSquare class="w-4 h-4" />
        Kanban Board
      </RouterLink>
    </nav>
    <main class="flex-1">
      <RouterView />
    </main>
  </div>
</template>

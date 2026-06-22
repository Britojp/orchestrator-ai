<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { Bot, LayoutDashboard, KanbanSquare, Settings, FolderKanban } from 'lucide-vue-next';
import { computed } from 'vue';

const route = useRoute();

const isActive = (path: string) => computed(() =>
  route.path === path ? 'bg-primary-100 text-primary-950 font-medium' : 'text-primary-600 hover:bg-primary-50 hover:text-primary-900'
).value;
</script>

<template>
  <aside class="w-64 bg-primary-50 border-r border-primary-200 flex flex-col h-screen shrink-0">
    <div class="h-14 flex items-center px-4 border-b border-primary-200">
      <span class="font-semibold text-primary-950 flex items-center gap-2">
        <div class="w-6 h-6 rounded bg-primary-950 text-white flex items-center justify-center text-xs">AI</div>
        Workspace
      </span>
    </div>

    <div class="p-3 flex-1 overflow-y-auto flex flex-col gap-1">
      <div class="text-xs font-medium text-primary-400 uppercase tracking-wider mb-2 px-3 mt-4">Menu</div>

      <RouterLink to="/" :class="['flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors', isActive('/')]">
        <LayoutDashboard class="w-4 h-4" />
        Dashboard
      </RouterLink>

      <RouterLink to="/chat" :class="['flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors', isActive('/chat')]">
        <Bot class="w-4 h-4" />
        Conversations
      </RouterLink>

      <RouterLink to="/kanban" :class="['flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors', isActive('/kanban')]">
        <KanbanSquare class="w-4 h-4" />
        Task Board
      </RouterLink>

      <div class="text-xs font-medium text-primary-400 uppercase tracking-wider mb-2 px-3 mt-6">Projects</div>

      <RouterLink to="#" class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-primary-600 hover:bg-primary-50 hover:text-primary-900 transition-colors">
        <FolderKanban class="w-4 h-4" />
        Main Repository
      </RouterLink>
    </div>

    <div class="p-3 border-t border-primary-200">
      <button class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-primary-600 hover:bg-primary-50 hover:text-primary-900 transition-colors w-full text-left">
        <Settings class="w-4 h-4" />
        Settings
      </button>
    </div>
  </aside>
</template>

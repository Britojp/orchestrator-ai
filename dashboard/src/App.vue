<script setup lang="ts">
import { RouterView } from 'vue-router';
import Sidebar from './components/Sidebar.vue';
import ContextPanel from './components/ContextPanel.vue';
</script>

<template>
  <div class="h-screen w-full bg-primary-50 flex overflow-hidden text-primary-950 font-sans">

    <!-- Left Column: Navigation / Operations -->
    <Sidebar />

    <!-- Center Column: Main Workspace Area -->
    <main class="flex-1 flex flex-col min-w-0 overflow-hidden bg-white shadow-[0_0_15px_rgba(0,0,0,0.03)] z-10">
      <RouterView />
    </main>

    <!-- Right Column: Context & Details -->
    <ContextPanel />

  </div>
</template>

<style>
/* Optional: Global tweaks for smooth scrolling or specific text rendering if needed,
   though Tailwind base covers most of this. */
</style>

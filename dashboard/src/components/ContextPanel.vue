<script setup lang="ts">
import { Database, GitBranch, TerminalSquare } from 'lucide-vue-next';
</script>

<template>
  <aside class="w-80 bg-white border-l border-primary-200 flex flex-col h-screen shrink-0 hidden lg:flex">
    <div class="h-14 flex items-center px-4 border-b border-primary-200">
      <span class="font-medium text-sm text-primary-950">Context & Details</span>
    </div>

    <div class="p-4 flex-1 overflow-y-auto space-y-6">

      <!-- Project Info -->
      <section>
        <h3 class="text-xs font-semibold text-primary-500 uppercase tracking-wider mb-3">Project</h3>
        <div class="bg-primary-50 rounded-lg p-3 border border-primary-200">
          <div class="flex items-center gap-2 text-sm text-primary-950 font-medium mb-1">
            <Database class="w-4 h-4 text-primary-500" />
            orchestrator-ai
          </div>
          <p class="text-xs text-primary-600">Main monorepo workspace.</p>
        </div>
      </section>

      <!-- Active Branch -->
      <section>
        <h3 class="text-xs font-semibold text-primary-500 uppercase tracking-wider mb-3">Environment</h3>
        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="flex items-center gap-2 text-primary-600"><GitBranch class="w-4 h-4" /> Branch</span>
            <span class="font-mono text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded">develop</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="flex items-center gap-2 text-primary-600"><TerminalSquare class="w-4 h-4" /> Model</span>
            <span class="font-mono text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded">gpt-4o</span>
          </div>
        </div>
      </section>

      <!-- Recent Activity Placeholder -->
      <section>
        <h3 class="text-xs font-semibold text-primary-500 uppercase tracking-wider mb-3">Recent Activity</h3>
        <div class="text-sm text-primary-500 text-center py-4 bg-primary-50 rounded-lg border border-primary-100 border-dashed">
          No recent activity to display.
        </div>
      </section>

    </div>
  </aside>
</template>

<script setup lang="ts">
import { format } from 'date-fns';

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  status?: 'completed' | 'current' | 'upcoming' | 'failed';
}

defineProps<{
  events: TimelineEvent[];
}>();
</script>

<template>
  <div class="flow-root">
    <ul role="list" class="-mb-8">
      <li v-for="(event, eventIdx) in events" :key="event.id">
        <div class="relative pb-8">
          <span v-if="eventIdx !== events.length - 1" class="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
          <div class="relative flex space-x-3">
            <div>
              <span :class="[
                'h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white',
                event.status === 'completed' ? 'bg-green-500 text-white' :
                event.status === 'current' ? 'bg-blue-500 text-white' :
                event.status === 'failed' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'
              ]">
                <slot name="icon" :event="event">
                  <div class="h-2.5 w-2.5 rounded-full bg-current" />
                </slot>
              </span>
            </div>
            <div class="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
              <div>
                <p class="text-sm font-medium text-gray-900">{{ event.title }}</p>
                <p v-if="event.description" class="mt-1 text-sm text-gray-500">{{ event.description }}</p>
              </div>
              <div class="whitespace-nowrap text-right text-sm text-gray-500">
                <time :datetime="event.date">{{ format(new Date(event.date), 'MMM d, HH:mm') }}</time>
              </div>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

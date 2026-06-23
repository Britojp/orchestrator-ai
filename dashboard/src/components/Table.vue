<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <slot name="header"></slot>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <slot name="body"></slot>
      </tbody>
    </table>
  </div>
</template>

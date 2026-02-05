<script setup lang="ts">
definePageMeta({
  layout: 'default'
})
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="SPRINT">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <h1 class="text-2xl font-semibold">Hi</h1>
    </template>
  </UDashboardPanel>
</template>

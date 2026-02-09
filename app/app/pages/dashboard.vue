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
      <div class="p-4">
        <ApsProjectTree />
      </div>
    </template>
  </UDashboardPanel>
</template>

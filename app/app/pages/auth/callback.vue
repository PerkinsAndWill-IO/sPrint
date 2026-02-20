<script setup lang="ts">
definePageMeta({
  layout: 'landing'
})

onMounted(async () => {
  try {
    await $fetch('/api/auth/aps/exchange', { method: 'POST' })
    await navigateTo('/dashboard')
  } catch {
    await navigateTo('/')
  }
})
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center bg-background">
    <div class="flex flex-col items-center gap-4">
      <span class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p class="text-muted text-sm">Signing you in...</p>
    </div>
  </div>
</template>

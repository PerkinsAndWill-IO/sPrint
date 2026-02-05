<script setup lang="ts">
import { Motion } from 'motion-v'
import TheLogo from '~/components/TheLogo.vue'

definePageMeta({
  layout: 'landing'
})

const route = useRoute()
const router = useRouter()

// Check if user is authenticated and redirect to dashboard
onMounted(async () => {
  try {
    const { authenticated } = await $fetch<{ authenticated: boolean }>('/api/auth/check')
    
    if (authenticated) {
      // User is authenticated, redirect to dashboard
      await router.push('/dashboard')
    }
  } catch (error) {
    // If check fails, stay on landing page
    console.error('Auth check failed:', error)
  }
})

const isLoading = ref(false)

async function handleLogin() {
  try {
    isLoading.value = true
    const response = await $fetch<{ authUrl: string }>('/api/auth/aps/authorize')
    
    if (response?.authUrl) {
      window.location.href = response.authUrl
    }
  } catch (error) {
    console.error('Failed to initiate login:', error)
    isLoading.value = false
  }
}

const autodeskLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAAAAABWESUoAAAAnElEQVR4AWP4TwAMUgUrxRkQQAtDwWM3BlSAJt/Jw4BPwUktoAhuBZ+yGLAAJMdJM+BT8NibATtAOA6fgksmDDgBFsdJ28MBWMEWNMeVfEM4PJSBAd1xJpeQggVkM6rjeKYipN+kYDoo9BlCfqoghrT0FvyBXvINr+lmSI5bCXYYhuMQ+nE4DmE/dschwFFMx6EpwAg5fAqGRNYDALpzWU8T8jGAAAAAAElFTkSuQmCC'
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background">
    <!-- Animated background gradients -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <Motion
        as="div"
        class="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/30 rounded-full blur-[120px]"
        :initial="{ opacity: 0, scale: 0.5 }"
        :animate="{ 
          opacity: 1, 
          scale: [1, 1.1, 0.9, 1],
          x: [0, 100, -50, 50, 0],
          y: [0, 80, -40, 60, 0]
        }"
        :transition="{ 
          opacity: { duration: 1.5 },
          scale: { duration: 12, repeat: Infinity, ease: 'easeInOut' },
          x: { duration: 20, repeat: Infinity, ease: 'easeInOut' },
          y: { duration: 18, repeat: Infinity, ease: 'easeInOut' }
        }"
      />
      <Motion
        as="div"
        class="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-600/30 rounded-full blur-[120px]"
        :initial="{ opacity: 0, scale: 0.5 }"
        :animate="{ 
          opacity: 1, 
          scale: [1, 0.9, 1.1, 1],
          x: [0, -100, 50, -50, 0],
          y: [0, -80, 40, -60, 0]
        }"
        :transition="{ 
          opacity: { duration: 1.5, delay: 0.3 },
          scale: { duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 0.3 },
          x: { duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
          y: { duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }
        }"
      />
      <Motion
        as="div"
        class="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-purple-600/20 rounded-full blur-[100px]"
        :initial="{ opacity: 0 }"
        :animate="{ 
          opacity: 1, 
          scale: [1, 1.3, 0.8, 1.2, 1],
          x: [0, 60, -40, 30, 0],
          y: [0, -50, 70, -30, 0]
        }"
        :transition="{ 
          opacity: { duration: 1.5, delay: 0.6 },
          scale: { duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 },
          x: { duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 0.6 },
          y: { duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }
        }"
      />
    </div>

    <!-- Content -->
    <div class="relative z-10 flex flex-col items-center justify-center px-4 max-w-lg w-full">
      <Motion
        as="div"
        class="flex flex-col items-center space-y-12 w-full"
        :initial="{ opacity: 0, y: 20 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.8, ease: 'easeOut' }"
      >
        <!-- Logo/Title Section -->
        <div class="text-center space-y-6">
          <Motion
            as="div"
            class="flex justify-center"
            :initial="{ opacity: 0, scale: 0.9 }"
            :animate="{ opacity: 1, scale: 1 }"
            :transition="{ duration: 0.8, delay: 0.2, type: 'spring' }"
          >
            <TheLogo class="w-64 md:w-80" />
          </Motion>
          <Motion
            as="p"
            class="text-lg md:text-xl text-slate-400 font-light"
            :initial="{ opacity: 0 }"
            :animate="{ opacity: 1 }"
            :transition="{ duration: 0.8, delay: 0.4 }"
          >
            Seamless Autodesk Cloud Printing
          </Motion>
        </div>
        
        <!-- Login Button -->
        <Motion
          as="div"
          class="w-full max-w-xs"
          :initial="{ opacity: 0, y: 20 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.6, delay: 0.6 }"
        >
          <button
            @click="handleLogin"
            :disabled="isLoading"
            class="group w-full relative flex items-center justify-center gap-3 bg-white hover:bg-indigo-50 text-slate-900 px-8 py-4 rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          >
            <span v-if="isLoading" class="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
            <template v-else>
              <span class="font-semibold text-lg tracking-wide">Sign in with Autodesk</span>
              <img
                class="w-6 h-6 object-contain"
                :src="autodeskLogo"
                alt="Autodesk"
              />
            </template>
            
            <!-- Button glow effect -->
            <div class="absolute inset-0 rounded-full ring-2 ring-white/20 group-hover:ring-indigo-400/50 transition-all duration-300"></div>
          </button>
        </Motion>

        <!-- Footer Text -->
        <Motion
          as="p"
          class="text-sm text-slate-500 text-center max-w-xs"
          :initial="{ opacity: 0 }"
          :animate="{ opacity: 1 }"
          :transition="{ duration: 0.8, delay: 0.8 }"
        >
          Connect your BIM360 & ACC accounts to start managing your prints efficiently.
        </Motion>
      </Motion>
    </div>
  </div>
</template>


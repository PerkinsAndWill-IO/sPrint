import { createSharedComposable } from '@vueuse/core'

const _useDashboard = () => {
  const router = useRouter()

  defineShortcuts({
    'g-h': () => router.push('/dashboard')
  })

  return {}
}

export const useDashboard = createSharedComposable(_useDashboard)

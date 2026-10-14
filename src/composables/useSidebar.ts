// =============================================================================
// 侧栏 / 移动端抽屉
// 与 src/styles/tokens.scss 中的 $bp-md 保持一致。
// =============================================================================

import { ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'

const MOBILE_QUERY = '(max-width: 899px)'

const isMobile = useMediaQuery(MOBILE_QUERY)
const isDrawerOpen = ref(false)

// 回到桌面宽度时自动收起抽屉
watch(isMobile, (mobile) => {
  if (!mobile) isDrawerOpen.value = false
})

export function useSidebar() {
  return {
    isMobile,
    isDrawerOpen,
    openDrawer: () => {
      isDrawerOpen.value = true
    },
    closeDrawer: () => {
      isDrawerOpen.value = false
    },
    toggleDrawer: () => {
      isDrawerOpen.value = !isDrawerOpen.value
    },
  }
}

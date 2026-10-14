// =============================================================================
// 主题（亮 / 暗）—模块级单例
// 规则：默认跟随系统；用户手动切换后写入 localStorage，此后以用户选择为准。
// 首屏防闪白由 index.html 的内联脚本负责，两者共用同一 storage key。
// =============================================================================

import { computed, ref, watch } from 'vue'

export type ThemeName = 'light' | 'dark'

/** localStorage 键名（与 index.html 内联脚本保持一致） */
export const THEME_STORAGE_KEY = 'fi-theme'

const media = typeof window === 'undefined' ? null : window.matchMedia('(prefers-color-scheme: dark)')

function readStored(): ThemeName | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

/** 用户显式选择的主题；null 表示跟随系统 */
const userChoice = ref<ThemeName | null>(readStored())
/** 系统深色偏好（响应式） */
const systemDark = ref(media?.matches ?? false)
/** 当前实际生效的主题 */
const theme = ref<ThemeName>('light')

media?.addEventListener('change', (event) => {
  systemDark.value = event.matches
})

function resolveTheme(): ThemeName {
  return userChoice.value ?? (systemDark.value ? 'dark' : 'light')
}

watch(
  [userChoice, systemDark],
  () => {
    theme.value = resolveTheme()
    document.documentElement.classList.toggle('dark', theme.value === 'dark')
  },
  { immediate: true },
)

export function useTheme() {
  const isDark = computed(() => theme.value === 'dark')

  /** 在亮 / 暗之间切换，并记住用户的选择 */
  function toggle(): void {
    userChoice.value = theme.value === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(THEME_STORAGE_KEY, userChoice.value)
    } catch {
      // 隐私模式等场景下读写 localStorage 可能失败，忽略即可
    }
  }

  return { theme, isDark, toggle }
}

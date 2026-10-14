// =============================================================================
// 主题：亮 / 暗切换
// 复用 @vueuse 的 useDark，在 <html> 上增删 .dark 类；存储键与 index.html 的
// 内联脚本保持一致，避免首屏闪白。
// =============================================================================

import { useDark, useToggle } from '@vueuse/core'
import { readonly } from 'vue'

const isDark = useDark({
  storageKey: 'fi-theme',
  valueDark: 'dark',
  valueLight: 'light',
  selector: 'html',
})

const toggleDark = useToggle(isDark)

export function useTheme() {
  return {
    isDark: readonly(isDark),
    toggleDark: () => toggleDark(),
  }
}

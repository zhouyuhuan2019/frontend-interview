// =============================================================================
// 代码高亮器（Shiki）
// 只初始化一次；之后就绪后 codeToHtml 是同步调用，因此可以在 computed 里直接用。
// 语言与主题都用动态 import，交给打包器自动分包，不进入主 chunk。
// =============================================================================

import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

/** 双主题：亮/暗各一套，渲染时输出 CSS 变量，切换主题无需重新高亮 */
export const CODE_THEMES = {
  light: 'github-light',
  dark: 'github-dark',
} as const

let highlighterPromise: Promise<HighlighterCore> | null = null
let highlighter: HighlighterCore | null = null

/** 预热高亮器；可在应用启动时先行调用（不阻塞首屏） */
export function ensureHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    themes: [import('@shikijs/themes/github-light'), import('@shikijs/themes/github-dark')],
    langs: [
      import('@shikijs/langs/javascript'),
      import('@shikijs/langs/typescript'),
      import('@shikijs/langs/jsx'),
      import('@shikijs/langs/tsx'),
      import('@shikijs/langs/html'),
      import('@shikijs/langs/css'),
      import('@shikijs/langs/scss'),
      import('@shikijs/langs/json'),
      import('@shikijs/langs/vue'),
      import('@shikijs/langs/vue-html'),
      import('@shikijs/langs/bash'),
      import('@shikijs/langs/sql'),
      import('@shikijs/langs/yaml'),
      import('@shikijs/langs/markdown'),
      import('@shikijs/langs/diff'),
    ],
    // 浏览器端无需下载 wasm，体积更小
    engine: createJavaScriptRegexEngine(),
  }).then((instance) => {
    highlighter = instance
    return instance
  })

  return highlighterPromise
}

/** 同步取已就绪的高亮器；未就绪时返回 null */
export function getHighlighter(): HighlighterCore | null {
  return highlighter
}

// =============================================================================
// 代码围栏信息串解析
// 语法：```<lang> [flag...] [title="..."]
// 例：```js run readonly title="示例 1"
// 例：```text output
// =============================================================================

export interface FenceInfo {
  /** 语言（小写；未指定时为 text） */
  lang: string
  /** 附加标记，如 run / readonly / output */
  flags: Set<string>
  /** 自定义标题 */
  title?: string
}

const LANG_ALIAS: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  sh: 'bash',
  shell: 'bash',
  yml: 'yaml',
}

/** 归一化语言别名（用于高亮与运行判定） */
export function normalizeLang(lang: string): string {
  return LANG_ALIAS[lang] ?? lang
}

/** 是否为可在浏览器内运行的纯 JS 语言 */
export function isRunnableLang(lang: string): boolean {
  return normalizeLang(lang) === 'javascript'
}

/** 解析围栏信息串 */
export function parseFenceInfo(info: string): FenceInfo {
  const parts = info.trim().split(/\s+/).filter(Boolean)
  const lang = (parts.shift() ?? 'text').toLowerCase()
  const flags = new Set<string>()
  let title: string | undefined

  for (const part of parts) {
    const matched = /^([a-zA-Z-]+)="(.*)"$/.exec(part)
    if (matched && matched[1] === 'title') {
      title = matched[2]
    } else {
      flags.add(part)
    }
  }

  return { lang, flags, title }
}

// =============================================================================
// Markdown 渲染：把正文切成一维「块」数组
// - 普通块 → 直接渲染成 HTML
// - 代码块 → 交给 Vue 组件（支持复制 / 运行 / 输出对照），并预先做代码高亮
// 调用前需保证 ensureHighlighter() 已 resolve，之后本模块全同步。
// =============================================================================

import MarkdownIt from 'markdown-it'
import { isRunnableLang, normalizeLang, parseFenceInfo } from '@/content/fence'
import type { MdBlock } from '@/content/types'
import { CODE_THEMES, getHighlighter } from './useShiki'

type MarkdownToken = ReturnType<InstanceType<typeof MarkdownIt>['parse']>[number]

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: false,
  typographer: false,
})

// 给表格套一层滚动容器：窄屏下宽表格可在自身区域内左右滑动，不会撑破整页。
md.renderer.rules.table_open = (tokens, idx, options, _env, self) =>
  `<div class="md-table">${self.renderToken(tokens, idx, options)}`
md.renderer.rules.table_close = (tokens, idx, options, _env, self) =>
  `${self.renderToken(tokens, idx, options)}</div>`

/** 正文渲染缓存：同一段正文只渲染一次 */
const blockCache = new Map<string, MdBlock[]>()

/**
 * 依据 markdown-it 自身的 level / nesting 语义，把 token 流切成顶层块。
 * 顶层块内部可能包含多个 token（如 list 的 open / inline / close）。
 */
function splitTopLevelBlocks(tokens: MarkdownToken[]): MarkdownToken[][] {
  const groups: MarkdownToken[][] = []
  let current: MarkdownToken[] | null = null

  for (const token of tokens) {
    if (current) {
      current.push(token)
      if (token.level === 0 && token.nesting === -1) {
        groups.push(current)
        current = null
      }
      continue
    }

    if (token.level === 0 && token.nesting === 1) {
      current = [token]
    } else if (token.level === 0) {
      // fence / code_block / hr / html_block 等自闭合块
      groups.push([token])
    }
  }

  if (current) groups.push(current)
  return groups
}

/** 未注册的语言回退为纯文本，避免高亮抛错 */
function resolveHighlightLang(lang: string): string {
  const highlighter = getHighlighter()
  if (!highlighter) return 'text'
  if (lang === 'text' || lang === 'plaintext') return 'text'
  return highlighter.getLoadedLanguages().includes(lang) ? lang : 'text'
}

/**
 * 渲染 Markdown 正文为块数组。
 * @param markdown 原始正文
 * @param cacheKey 传入题目 id 可命中缓存
 */
export function renderMarkdownBlocks(markdown: string, cacheKey?: string): MdBlock[] {
  if (cacheKey) {
    const cached = blockCache.get(cacheKey)
    if (cached) return cached
  }

  const highlighter = getHighlighter()
  if (!highlighter) {
    throw new Error('[markdown] 高亮器尚未就绪，请先 await ensureHighlighter()')
  }

  const blocks = splitTopLevelBlocks(md.parse(markdown, {})).map<MdBlock>((group) => {
    const first = group[0]

    if (first && first.type === 'fence') {
      const { lang, flags, title } = parseFenceInfo(first.info)
      return {
        kind: 'code',
        code: first.content,
        lang,
        title,
        runnable: flags.has('run') && isRunnableLang(lang),
        readonly: flags.has('readonly'),
        isOutput: flags.has('output'),
        html: highlighter.codeToHtml(first.content, {
          lang: resolveHighlightLang(normalizeLang(lang)),
          themes: CODE_THEMES,
          defaultColor: false,
        }),
      }
    }

    return { kind: 'html', html: md.renderer.render(group, md.options, {}) }
  })

  if (cacheKey) blockCache.set(cacheKey, blocks)
  return blocks
}

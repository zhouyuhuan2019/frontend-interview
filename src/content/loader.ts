// =============================================================================
// 内容加载：用 Vite 的 import.meta.glob 读取 content/ 下的全部内容文件
// 该模块是唯一接触 import.meta.glob 的地方，其余层级只消费它导出的纯数据。
// =============================================================================

import { parse as parseYAML } from 'yaml'

/** 全部题目的原始 Markdown 文本，键为以项目根为基准的文件路径 */
const rawMarkdownFiles = import.meta.glob('/content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** 分类元数据文件（YAML）的原始文本 */
const rawCategoryFile = import.meta.glob('/content/categories.yml', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export interface ParsedFrontmatter {
  data: Record<string, unknown>
  body: string
}

/**
 * 解析 Markdown 头部的 YAML frontmatter。
 * 只识别文件开头的 `---` 块；未命中时返回空的元数据。
 */
export function parseFrontmatter(raw: string): ParsedFrontmatter {
  // 去 BOM，否则首行匹配不上
  const text = raw.replace(/^\uFEFF/, '')
  const matched = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text)
  if (!matched) return { data: {}, body: text }

  const parsed = parseYAML(matched[1]) as Record<string, unknown> | null
  return { data: parsed ?? {}, body: text.slice(matched[0].length) }
}

export interface RawQuestionFile {
  /** 源文件路径，如 /content/js/001-xxx.md */
  path: string
  /** 一级分类目录名 */
  categoryDir: string
  /** 文件名（不含扩展名，不含分类前缀） */
  slug: string
  /** 原始文本 */
  raw: string
}

/** 收集 content/ 下的全部题目文件 */
export function collectRawQuestionFiles(): RawQuestionFile[] {
  return Object.entries(rawMarkdownFiles)
    .map(([path, raw]) => {
      const segments = path.replace(/^\/content\//, '').replace(/\.md$/, '').split('/')
      return {
        path,
        categoryDir: segments[0] ?? '',
        slug: segments.slice(1).join('/'),
        raw,
      }
    })
    .sort((a, b) => a.path.localeCompare(b.path))
}

export interface RawCategory {
  id?: unknown
  title?: unknown
  desc?: unknown
  order?: unknown
  subtopics?: unknown
}

/** 读取并解析 categories.yml；文件缺失时返回空数组 */
export function readRawCategories(): RawCategory[] {
  const entry = Object.values(rawCategoryFile)[0]
  if (!entry) {
    console.warn('[content] 未找到 content/categories.yml，分类将按目录名自动生成')
    return []
  }

  const parsed = parseYAML(entry) as unknown
  if (!Array.isArray(parsed)) {
    console.warn('[content] categories.yml 顶层结构应为数组')
    return []
  }

  return parsed.filter((item): item is RawCategory => !!item && typeof item === 'object')
}

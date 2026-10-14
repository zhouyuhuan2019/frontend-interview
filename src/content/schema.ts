// =============================================================================
// 元信息归一化与兜底
// 原则：字段缺失一律给默认值并告警，绝不抛错打断构建，保证「加题不阻塞开发」。
// =============================================================================

import type { Difficulty, Frequency, Question } from './types'

const DIFFICULTIES: readonly Difficulty[] = ['junior', 'middle', 'senior']
const FREQUENCIES: readonly Frequency[] = ['high', 'medium', 'low']

const DEFAULT_ORDER = 999

/** 答案区起始标题：其前的正文视为题干 */
const ANSWER_HEADING_PATTERN = /^##[ \t]+(?:参考答案|答案)[ \t]*$/m

/**
 * 把正文切成「题干 + 答案」：
 * - 第一个 `## 参考答案`（或 `## 答案`）之前 → 题干，始终展示
 * - 自该标题起 → 答案，折叠展示
 * - 没有该标题 → 题干为空，全文为答案（向后兼容）
 */
function splitStem(body: string): { stem: string; answer: string } {
  const matched = ANSWER_HEADING_PATTERN.exec(body)
  if (!matched) return { stem: '', answer: body }

  return {
    stem: body.slice(0, matched.index).trim(),
    answer: body.slice(matched.index),
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asDifficulty(value: unknown): Difficulty {
  const text = asString(value)
  return DIFFICULTIES.includes(text as Difficulty) ? (text as Difficulty) : 'middle'
}

function asFrequency(value: unknown): Frequency {
  const text = asString(value)
  return FREQUENCIES.includes(text as Frequency) ? (text as Frequency) : 'medium'
}

export interface NormalizeQuestionInput {
  data: Record<string, unknown>
  body: string
  path: string
  categoryDir: string
  slug: string
}

/** 把（可能不完整的）frontmatter 归一化为完整题目记录 */
export function normalizeQuestion(input: NormalizeQuestionInput): Question {
  const { data, body, path, categoryDir, slug } = input
  const title = asString(data.title)

  if (!title) {
    console.warn(`[content] 缺少必填字段 title：${path}`)
  }
  if (data.order !== undefined && typeof data.order !== 'number') {
    console.warn(`[content] order 应为数字，已忽略：${path}`)
  }

  const id = asString(data.id) || `${categoryDir}-${slug.replace(/\//g, '-')}`
  const { stem, answer } = splitStem(body)

  return {
    id,
    title: title || `（未命名题目：${slug}）`,
    categoryId: asString(data.category) || categoryDir,
    subtopic: asString(data.subtopic),
    difficulty: asDifficulty(data.difficulty),
    frequency: asFrequency(data.frequency),
    tags: asStringArray(data.tags),
    stack: asStringArray(data.stack),
    order: asNumber(data.order, DEFAULT_ORDER),
    related: asStringArray(data.related),
    updated: asString(data.updated),
    draft: data.draft === true,
    stem,
    body: answer,
    path,
  }
}

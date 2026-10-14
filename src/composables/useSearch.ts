// =============================================================================
// 搜索：MiniSearch 索引
// 中文没有天然词边界，这里用 bigram（二元组）切分，无需依赖 Intl.Segmenter。
// 索引懒构建；题库规模在数百题量级，主线程构建耗时可忽略。
// =============================================================================

import MiniSearch from 'minisearch'
import type { Difficulty, SearchHit } from '@/content/types'
import { listQuestions } from './useContent'

const CJK_PATTERN = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/
const CJK_SEGMENT = /[^a-z0-9\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]+/

/** 中文按 bigram 切分，英文与数字保持整词 */
export function tokenize(text: string): string[] {
  const tokens: string[] = []

  for (const segment of text.toLowerCase().split(CJK_SEGMENT)) {
    if (!segment) continue

    if (CJK_PATTERN.test(segment)) {
      tokens.push(segment)
      for (let index = 0; index < segment.length - 1; index += 1) {
        tokens.push(segment.slice(index, index + 2))
      }
    } else {
      tokens.push(segment)
    }
  }

  return tokens
}

interface SearchDocument {
  id: string
  title: string
  tags: string
  subtopic: string
  categoryId: string
  body: string
}

let searchIndex: MiniSearch<SearchDocument> | null = null

function buildIndex(): MiniSearch<SearchDocument> {
  const index = new MiniSearch<SearchDocument>({
    fields: ['title', 'tags', 'subtopic', 'categoryId', 'body'],
    storeFields: ['title', 'tags', 'categoryId'],
    tokenize,
    searchOptions: {
      boost: { title: 4, tags: 3, subtopic: 2 },
      prefix: true,
      fuzzy: 0.2,
      combineWith: 'AND',
    },
  })

  index.addAll(
    listQuestions().map((question) => ({
      id: question.id,
      title: question.title,
      tags: question.tags.join(' '),
      subtopic: question.subtopic,
      categoryId: question.categoryId,
      body: `${question.stem}\n${question.body}`,
    })),
  )

  return index
}

/** 生成命中摘要：从正文里截取命中关键词附近的一小段文本 */
function buildSnippet(body: string, terms: string[]): string {
  const plain = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*`_~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const hitIndex = terms
    .map((term) => plain.toLowerCase().indexOf(term.toLowerCase()))
    .filter((position) => position >= 0)
    .sort((a, b) => a - b)[0]

  if (hitIndex === undefined) return plain.slice(0, 80)

  const start = Math.max(0, hitIndex - 24)
  const end = Math.min(plain.length, hitIndex + 56)
  return `${start > 0 ? '…' : ''}${plain.slice(start, end)}${end < plain.length ? '…' : ''}`
}

/** 关键词搜索；空关键词返回空结果 */
export function searchQuestions(keyword: string, limit = 30): SearchHit[] {
  const query = keyword.trim()
  if (!query) return []

  searchIndex ??= buildIndex()

  const bodyById = new Map(listQuestions().map((question) => [question.id, `${question.stem}\n${question.body}`]))
  const difficultyById = new Map(listQuestions().map((question) => [question.id, question.difficulty]))
  const tagById = new Map(listQuestions().map((question) => [question.id, question.tags]))

  return searchIndex.search(query).slice(0, limit).map((result) => ({
    id: result.id,
    title: String(result.title ?? ''),
    categoryId: String(result.categoryId ?? ''),
    difficulty: (difficultyById.get(result.id) ?? 'middle') as Difficulty,
    tags: tagById.get(result.id) ?? [],
    snippet: buildSnippet(bodyById.get(result.id) ?? '', result.terms),
  }))
}

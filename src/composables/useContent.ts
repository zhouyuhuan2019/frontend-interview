// =============================================================================
// 题库数据源（模块级单例）
// 内容在模块首次使用时一次性解析完成，所有组件共享同一份数据，无需状态管理库。
// =============================================================================

import { computed, ref, shallowRef } from 'vue'
import { collectRawQuestionFiles, parseFrontmatter, readRawCategories } from '@/content/loader'
import { normalizeQuestion } from '@/content/schema'
import type { Category, Question } from '@/content/types'

interface DeclaredCategory {
  id: string
  title: string
  desc: string
  subtopics: string[]
  order: number
}

const questions = shallowRef<Question[]>([])
const categories = ref<Category[]>([])
let initialized = false

function compareQuestion(a: Question, b: Question): number {
  if (a.order !== b.order) return a.order - b.order
  return a.title.localeCompare(b.title, 'zh-Hans-CN')
}

function readDeclaredCategories(): DeclaredCategory[] {
  return readRawCategories()
    .map((item, index) => {
      const id = typeof item.id === 'string' ? item.id.trim() : ''
      if (!id) return null
      const title = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : id
      return {
        id,
        title,
        desc: typeof item.desc === 'string' ? item.desc : '',
        subtopics: Array.isArray(item.subtopics)
          ? item.subtopics.filter((subtopic): subtopic is string => typeof subtopic === 'string')
          : [],
        order: typeof item.order === 'number' ? item.order : (index + 1) * 10,
      }
    })
    .filter((item): item is DeclaredCategory => item !== null)
}

function initialize(): void {
  const list = collectRawQuestionFiles()
    .map((file) => {
      const { data, body } = parseFrontmatter(file.raw)
      return normalizeQuestion({
        data,
        body,
        path: file.path,
        categoryDir: file.categoryDir,
        slug: file.slug,
      })
    })
    .filter((question) => !question.draft)
    .sort(compareQuestion)

  const declared = readDeclaredCategories()
  const known = new Set(declared.map((item) => item.id))

  // 目录名未在 categories.yml 中声明时自动兜底，避免题目被隐藏
  for (const question of list) {
    if (known.has(question.categoryId)) continue
    known.add(question.categoryId)
    console.warn(`[content] 分类「${question.categoryId}」未在 content/categories.yml 中声明，已自动生成`)
    declared.push({
      id: question.categoryId,
      title: question.categoryId,
      desc: '',
      subtopics: [],
      order: 900,
    })
  }

  categories.value = declared
    .map((item) => ({
      ...item,
      count: list.filter((question) => question.categoryId === item.id).length,
    }))
    .sort((a, b) => a.order - b.order)

  questions.value = list
  initialized = true
}

function ensureInitialized(): void {
  if (!initialized) initialize()
}

/** 非组件环境（如搜索索引构建）读取题库 */
export function listQuestions(): Question[] {
  ensureInitialized()
  return questions.value
}

/** 非组件环境读取分类 */
export function listCategories(): Category[] {
  ensureInitialized()
  return categories.value
}

export function useContent() {
  ensureInitialized()

  const questionIndex = computed(() => new Map(questions.value.map((question) => [question.id, question])))
  const categoryIndex = computed(() => new Map(categories.value.map((category) => [category.id, category])))

  return {
    questions,
    categories,
    categoryOf: (categoryId: string) => categoryIndex.value.get(categoryId),
    questionOf: (questionId: string) => questionIndex.value.get(questionId),
    questionsOf: (categoryId: string) => questions.value.filter((question) => question.categoryId === categoryId),
  }
}

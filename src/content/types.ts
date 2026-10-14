// =============================================================================
// 内容层类型定义（纯类型，不依赖 Vue）
// =============================================================================

/** 难度等级 */
export type Difficulty = 'junior' | 'middle' | 'senior'

/** 面试频率 */
export type Frequency = 'high' | 'medium' | 'low'

/** 归一化后的题目元信息 */
export interface QuestionMeta {
  /** 唯一标识，默认由「分类目录名 - 文件名」派生 */
  id: string
  /** 题目（问题本身） */
  title: string
  /** 所属一级分类 id */
  categoryId: string
  /** 二级主题 */
  subtopic: string
  /** 难度 */
  difficulty: Difficulty
  /** 面试频率 */
  frequency: Frequency
  /** 标签 */
  tags: string[]
  /** 关联技术栈（vue2 / vue3 / react 等） */
  stack: string[]
  /** 分类内排序值，越小越靠前 */
  order: number
  /** 相关题目 id */
  related: string[]
  /** 最近更新日期 */
  updated: string
  /** 是否为草稿（草稿不进入站点） */
  draft: boolean
}

/** 完整题目记录 */
export interface Question extends QuestionMeta {
  /** 题干（正文第一个「## 参考答案」之前的内容，始终展示；可为空字符串） */
  stem: string
  /** Markdown 正文（未渲染，自「## 参考答案」起） */
  body: string
  /** 源文件路径，用于调试定位 */
  path: string
}

/** 分类元信息 */
export interface Category {
  id: string
  title: string
  desc: string
  subtopics: string[]
  order: number
  /** 该分类下的题目数量 */
  count: number
}

/** 渲染后的 Markdown 内容块 */
export type MdBlock =
  | { kind: 'html'; html: string }
  | {
      kind: 'code'
      /** 高亮后的 HTML */
      html: string
      /** 原始代码文本 */
      code: string
      /** 代码语言（原始写法，如 js / ts） */
      lang: string
      /** 代码块标题，来自信息串中的 title="xxx" */
      title?: string
      /** 是否允许在浏览器内运行 */
      runnable: boolean
      /** 是否只读（不可编辑但仍可运行） */
      readonly: boolean
      /** 是否为「期望输出」面板 */
      isOutput: boolean
    }

/** 搜索结果条目 */
export interface SearchHit {
  id: string
  title: string
  categoryId: string
  difficulty: Difficulty
  tags: string[]
  /** 命中摘要（含少量上下文） */
  snippet: string
}

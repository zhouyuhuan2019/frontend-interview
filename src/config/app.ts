// =============================================================================
// 站点级常量
// =============================================================================

export const APP = {
  /** 站点标题 */
  title: '前端面试题库',
  /** 副标题 */
  subtitle: '问题 · 答案 · 原理讲解',
  /** 浏览器内运行代码的超时时间（毫秒） */
  runTimeoutMs: 3000,
  /** 搜索输入去抖时间（毫秒） */
  searchDebounceMs: 120,
} as const

/** 难度展示文案 */
export const DIFFICULTY_LABEL: Record<string, string> = {
  junior: '初级',
  middle: '中级',
  senior: '高级',
}

/** 面试频率展示文案 */
export const FREQUENCY_LABEL: Record<string, string> = {
  high: '高频',
  medium: '常考',
  low: '了解',
}

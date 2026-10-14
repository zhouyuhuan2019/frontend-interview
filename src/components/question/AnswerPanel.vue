<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import MarkdownRenderer from '@/components/question/MarkdownRenderer.vue'
import { renderMarkdownBlocks } from '@/composables/useMarkdown'
import { ensureHighlighter } from '@/composables/useShiki'
import type { MdBlock } from '@/content/types'

const props = defineProps<{
  /** Markdown 正文 */
  body: string
  /** 缓存键，通常传题目 id */
  cacheKey: string
}>()

const isReady = ref(false)

const blocks = computed<MdBlock[]>(() => (isReady.value ? renderMarkdownBlocks(props.body, props.cacheKey) : []))

onMounted(async () => {
  await ensureHighlighter()
  isReady.value = true
})
</script>

<template>
  <div class="answer-panel">
    <p v-if="!isReady" class="answer-panel__loading">正在准备代码高亮…</p>
    <MarkdownRenderer v-else :blocks="blocks" />
  </div>
</template>

<style scoped lang="scss">
// =============================================================================
// 答案解析面板
// =============================================================================

.answer-panel {
  min-height: 40px;
}

.answer-panel__loading {
  margin: 0;
  font-size: $font-sm;
  color: var(--c-text-subtle);
}
</style>

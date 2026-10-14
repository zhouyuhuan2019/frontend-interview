<script setup lang="ts">
import CodeBlock from '@/components/code/CodeBlock.vue'
import CodeOutput from '@/components/code/CodeOutput.vue'
import CodeRunner from '@/components/code/CodeRunner.vue'
import type { MdBlock } from '@/content/types'

defineProps<{ blocks: MdBlock[] }>()
</script>

<template>
  <article class="markdown-renderer">
    <template v-for="(block, index) in blocks" :key="index">
      <CodeRunner v-if="block.kind === 'code' && block.runnable" :block="block" />
      <CodeOutput v-else-if="block.kind === 'code' && block.isOutput" :block="block" />
      <CodeBlock v-else-if="block.kind === 'code'" :block="block" />

      <!-- 正文只渲染本仓库自有的 Markdown，内容受信 -->
      <div v-else class="markdown-body" v-html="block.html" />
    </template>
  </article>
</template>

<style scoped lang="scss">
// =============================================================================
// Markdown 渲染容器：块之间用 gap 控制间距，块内部排版见 styles/markdown.scss
// =============================================================================

.markdown-renderer {
  display: flex;
  flex-direction: column;
  gap: $space-md;
}
</style>

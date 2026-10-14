<script setup lang="ts">
import type { MdBlock } from '@/content/types'

type CodeBlock = Extract<MdBlock, { kind: 'code' }>

defineProps<{ block: CodeBlock }>()
</script>

<template>
  <figure class="code-output">
    <figcaption class="code-output__bar">期望输出</figcaption>
    <!-- 纯文本，按字面渲染 -->
    <pre class="code-output__body">{{ block.code }}</pre>
  </figure>
</template>

<style scoped lang="scss">
// =============================================================================
// 期望输出面板：与可运行代码对照，方便自测
// =============================================================================

.code-output {
  margin: 0;
  border: 1px dashed var(--c-border-strong);
  border-radius: $radius-md;
  overflow: hidden;
  background: var(--c-bg-sunken);
}

.code-output__bar {
  padding: $space-xs $space-md;
  border-bottom: 1px dashed var(--c-border-strong);
  font-size: $font-xs;
  letter-spacing: 0.04em;
  color: var(--c-text-subtle);
}

.code-output__body {
  margin: 0;
  padding: $space-md;
  overflow-x: auto;
  font-size: $font-sm;
  line-height: 1.6;
  color: var(--c-text-muted);
  white-space: pre-wrap;
}
</style>

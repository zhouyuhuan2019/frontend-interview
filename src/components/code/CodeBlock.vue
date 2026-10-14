<script setup lang="ts">
import { computed } from 'vue'
import { useClipboard } from '@vueuse/core'
import type { MdBlock } from '@/content/types'

type CodeBlock = Extract<MdBlock, { kind: 'code' }>

const props = defineProps<{ block: CodeBlock }>()

const languageLabel = computed(() => props.block.title ?? props.block.lang)
const { copy, copied } = useClipboard({ source: computed(() => props.block.code) })
</script>

<template>
  <figure class="code-block">
    <figcaption class="code-block__bar">
      <span class="code-block__lang">{{ languageLabel }}</span>
      <button class="code-block__action" type="button" @click="copy()">
        {{ copied ? '已复制' : '复制' }}
      </button>
    </figcaption>

    <!-- 高亮结果来自 Shiki，内容受信 -->
    <div class="code-block__body" v-html="block.html" />
  </figure>
</template>

<style scoped lang="scss">
// =============================================================================
// 代码块（只读展示）
// =============================================================================

.code-block {
  margin: 0;
  border: 1px solid var(--c-border);
  border-radius: $radius-md;
  overflow: hidden;
  background: var(--c-bg-code);
}

.code-block__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-sm;
  padding: $space-xs $space-sm $space-xs $space-md;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-bg-sunken);
}

.code-block__lang {
  font-family: $font-mono;
  font-size: $font-xs;
  color: var(--c-text-subtle);
}

.code-block__action {
  padding: 1px $space-sm;
  border-radius: $radius-xs;
  font-size: $font-xs;
  color: var(--c-text-muted);

  &:hover {
    color: var(--c-brand);
    background: var(--c-hover);
  }

  &:focus-visible {
    @include focus-ring;
  }
}

.code-block__body {
  padding: $space-md;
  overflow-x: auto;
  font-size: $font-sm;
  line-height: 1.6;
}
</style>

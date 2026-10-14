<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import { useCodeRunner } from '@/composables/useCodeRunner'
import type { MdBlock } from '@/content/types'

type CodeBlock = Extract<MdBlock, { kind: 'code' }>

const props = defineProps<{ block: CodeBlock }>()

const source = ref(props.block.code)

// 题目切换时重置编辑内容
watch(
  () => props.block.code,
  (code) => {
    source.value = code
  },
)

const { lines, isRunning, run, reset } = useCodeRunner()

const editorRows = computed(() => Math.min(24, Math.max(4, source.value.split('\n').length)))

function handleRun(): void {
  run(source.value)
}

function handleReset(): void {
  source.value = props.block.code
  reset()
}
</script>

<template>
  <figure class="code-runner">
    <figcaption class="code-runner__bar">
      <span class="code-runner__lang">{{ block.title ?? '可运行示例' }}</span>
      <span class="code-runner__actions">
        <BaseButton size="sm" variant="primary" :disabled="isRunning" @click="handleRun">
          {{ isRunning ? '运行中…' : '运行' }}
        </BaseButton>
        <BaseButton v-if="!block.readonly" size="sm" @click="handleReset">重置</BaseButton>
      </span>
    </figcaption>

    <!-- 只读模式：直接展示高亮后的静态代码 -->
    <div v-if="block.readonly" class="code-runner__static" v-html="block.html" />

    <!-- 可编辑模式：提供 textarea -->
    <textarea
      v-else
      v-model="source"
      class="code-runner__editor"
      :rows="editorRows"
      spellcheck="false"
      aria-label="可编辑的示例代码"
    />

    <div v-if="lines.length" class="code-runner__output">
      <p v-for="(line, index) in lines" :key="index" class="code-runner__line" :class="`code-runner__line--${line.kind}`">
        {{ line.text }}
      </p>
    </div>
  </figure>
</template>

<style scoped lang="scss">
// =============================================================================
// 可运行代码块：编辑区 + 输出区
// =============================================================================

.code-runner {
  margin: 0;
  border: 1px solid var(--c-border);
  border-radius: $radius-md;
  overflow: hidden;
  background: var(--c-bg-code);
}

.code-runner__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-sm;
  padding: $space-xs $space-sm $space-xs $space-md;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-bg-sunken);
}

.code-runner__lang {
  font-family: $font-mono;
  font-size: $font-xs;
  color: var(--c-text-subtle);
}

.code-runner__actions {
  display: flex;
  gap: $space-xs;
}

.code-runner__static {
  padding: $space-md;
  overflow-x: auto;
  font-size: $font-sm;
  line-height: 1.6;
}

.code-runner__editor {
  display: block;
  width: 100%;
  padding: $space-md;
  border: none;
  outline: none;
  resize: vertical;
  background: transparent;
  font-family: $font-mono;
  font-size: $font-sm;
  line-height: 1.6;
  color: var(--c-text);
  tab-size: 2;
}

.code-runner__output {
  padding: $space-sm $space-md;
  border-top: 1px dashed var(--c-border-strong);
  background: var(--c-bg-sunken);
}

.code-runner__line {
  margin: 0;
  font-family: $font-mono;
  font-size: $font-sm;
  line-height: 1.6;
  white-space: pre-wrap;
  color: var(--c-text-muted);
}

.code-runner__line--result {
  color: var(--c-brand);
}

.code-runner__line--error {
  color: var(--c-danger);
}

.code-runner__line--system {
  color: var(--c-text-subtle);
  font-size: $font-xs;
}
</style>

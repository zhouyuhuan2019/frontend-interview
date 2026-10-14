<script setup lang="ts">
import { ref } from 'vue'

// 搜索输入框：只负责输入与清除，检索逻辑由使用方决定
defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)

function handleInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

function clear(): void {
  emit('update:modelValue', '')
  inputRef.value?.focus()
}

function focus(): void {
  inputRef.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div class="base-search">
    <svg class="base-search__icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M20 20l-3.5-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>

    <input
      ref="inputRef"
      class="base-search__input"
      type="search"
      :value="modelValue"
      :placeholder="placeholder ?? '搜索'"
      aria-label="搜索题目"
      autocomplete="off"
      @input="handleInput"
    />

    <button v-if="modelValue" class="base-search__clear" type="button" aria-label="清空搜索" @click="clear">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>

<style scoped lang="scss">
// =============================================================================
// 搜索输入框
// =============================================================================

.base-search {
  position: relative;
  display: flex;
  align-items: center;
  gap: $space-sm;
  padding: 0 $space-md;
  height: 36px;
  border: 1px solid var(--c-border);
  border-radius: $radius-md;
  background: var(--c-bg-sunken);
  transition: border-color 0.15s ease, background-color 0.15s ease;

  &:focus-within {
    border-color: var(--c-brand);
    background: var(--c-bg-elevated);
  }
}

.base-search__icon {
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
  color: var(--c-text-subtle);
}

.base-search__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: $font-sm;

  // 去掉浏览器原生 search 的清除按钮，统一用自定义按钮
  &::-webkit-search-cancel-button {
    display: none;
  }

  &::placeholder {
    color: var(--c-text-subtle);
  }
}

.base-search__clear {
  display: flex;
  flex: 0 0 20px;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: $radius-xs;
  color: var(--c-text-subtle);

  &:hover {
    color: var(--c-text);
    background: var(--c-hover);
  }

  svg {
    width: 12px;
    height: 12px;
  }
}
</style>

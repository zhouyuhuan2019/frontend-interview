<script setup lang="ts">
// 基础按钮：支持 ghost（默认）/ primary / plain 三种外观
withDefaults(
  defineProps<{
    variant?: 'ghost' | 'primary' | 'plain'
    size?: 'sm' | 'md'
  }>(),
  { variant: 'ghost', size: 'md' },
)
</script>

<template>
  <button class="base-button" :class="[`base-button--${variant}`, `base-button--${size}`]" type="button">
    <slot />
  </button>
</template>

<style scoped lang="scss">
// =============================================================================
// 按钮
// =============================================================================

.base-button {
  display: inline-flex;
  align-items: center;
  gap: $space-xs;
  border: 1px solid var(--c-border);
  border-radius: $radius-sm;
  background: var(--c-bg-elevated);
  color: var(--c-text-muted);
  transition: color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;

  &:hover:not(:disabled) {
    color: var(--c-brand);
    border-color: var(--c-brand);
    background: var(--c-hover);
  }

  &:focus-visible {
    @include focus-ring;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
}

.base-button--sm {
  padding: $space-2xs $space-sm;
  font-size: $font-xs;
}

.base-button--md {
  padding: $space-xs $space-md;
  font-size: $font-sm;
}

.base-button--primary {
  color: var(--c-on-brand);
  border-color: transparent;
  background: var(--c-brand);

  &:hover:not(:disabled) {
    color: var(--c-on-brand);
    background: var(--c-brand-strong);
  }
}

.base-button--plain {
  border-color: transparent;
  background: transparent;

  &:hover:not(:disabled) {
    background: var(--c-hover);
  }
}
</style>

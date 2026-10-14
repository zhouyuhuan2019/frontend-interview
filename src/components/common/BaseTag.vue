<script setup lang="ts">
// 通用标签：用于难度、频率、标签等小徽标
withDefaults(
  defineProps<{
    label: string
    tone?: 'default' | 'brand' | 'junior' | 'middle' | 'senior' | 'muted'
  }>(),
  { tone: 'default' },
)
</script>

<template>
  <span class="base-tag" :class="`base-tag--${tone}`">{{ label }}</span>
</template>

<style scoped lang="scss">
// =============================================================================
// 标签
// =============================================================================

.base-tag {
  display: inline-flex;
  align-items: center;
  padding: 1px $space-sm;
  border: 1px solid var(--c-border);
  border-radius: $radius-full;
  font-size: $font-xs;
  line-height: 1.7;
  white-space: nowrap;
  color: var(--c-text-muted);
  background: var(--c-bg-sunken);
}

.base-tag--brand {
  color: var(--c-brand);
  border-color: transparent;
  background: var(--c-brand-soft);
}

.base-tag--junior {
  color: var(--c-junior);
  border-color: currentColor;
  background: transparent;
}

.base-tag--middle {
  color: var(--c-middle);
  border-color: currentColor;
  background: transparent;
}

.base-tag--senior {
  color: var(--c-senior);
  border-color: currentColor;
  background: transparent;
}

.base-tag--muted {
  color: var(--c-text-subtle);
}
</style>

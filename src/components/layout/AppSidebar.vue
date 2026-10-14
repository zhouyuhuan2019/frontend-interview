<script setup lang="ts">
import AppSidebarGroup from '@/components/layout/AppSidebarGroup.vue'
import { useContent } from '@/composables/useContent'

const { categories, questions, questionsOf } = useContent()
</script>

<template>
  <nav class="app-sidebar">
    <RouterLink class="app-sidebar__home" to="/">
      <span class="app-sidebar__home-title">全部题目</span>
      <span class="app-sidebar__home-count">{{ questions.length }}</span>
    </RouterLink>

    <AppSidebarGroup
      v-for="category in categories"
      :key="category.id"
      :category="category"
      :questions="questionsOf(category.id)"
    />
  </nav>
</template>

<style scoped lang="scss">
// =============================================================================
// 侧栏：分类目录
// =============================================================================

.app-sidebar {
  display: flex;
  flex-direction: column;
}

.app-sidebar__home {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-sm;
  padding: $space-md $space-sm;
  border-bottom: 1px solid var(--c-border);
  color: var(--c-text);

  &:hover {
    color: var(--c-brand);
    text-decoration: none;
  }
}

.app-sidebar__home-title {
  font-size: $font-sm;
  font-weight: 600;
}

.app-sidebar__home-count {
  padding: 0 $space-xs;
  border-radius: $radius-full;
  background: var(--c-brand-soft);
  font-size: $font-xs;
  color: var(--c-brand);
}
</style>

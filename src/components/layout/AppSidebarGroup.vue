<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { Category, Question } from '@/content/types'

const props = defineProps<{
  category: Category
  questions: Question[]
}>()

const route = useRoute()

const isActive = computed(() => route.params.categoryId === props.category.id)
const isExpanded = ref(isActive.value)

// 进入该分类时自动展开
watch(isActive, (active) => {
  if (active) isExpanded.value = true
})
</script>

<template>
  <section class="sidebar-group">
    <button
      class="sidebar-group__head"
      :class="{ 'sidebar-group__head--active': isActive }"
      type="button"
      :aria-expanded="isExpanded"
      @click="isExpanded = !isExpanded"
    >
      <span class="sidebar-group__title">{{ category.title }}</span>
      <span class="sidebar-group__count">{{ category.count }}</span>
      <svg class="sidebar-group__chevron" :class="{ 'sidebar-group__chevron--open': isExpanded }" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 10l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <div class="sidebar-group__body" :class="{ 'sidebar-group__body--open': isExpanded }">
      <div class="sidebar-group__inner">
        <RouterLink
          v-for="question in questions"
          :key="question.id"
          class="sidebar-group__link"
          :class="{ 'sidebar-group__link--active': route.params.questionId === question.id }"
          :to="{ name: 'question', params: { categoryId: category.id, questionId: question.id } }"
        >
          {{ question.title }}
        </RouterLink>

        <p v-if="!questions.length" class="sidebar-group__empty">暂无题目</p>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
// =============================================================================
// 侧栏分类分组
// =============================================================================

.sidebar-group {
  border-bottom: 1px solid var(--c-border);
}

.sidebar-group__head {
  display: flex;
  align-items: center;
  gap: $space-sm;
  width: 100%;
  padding: $space-md $space-sm;
  text-align: left;
  color: var(--c-text-muted);

  &:hover {
    color: var(--c-text);
  }

  &:focus-visible {
    @include focus-ring;
  }
}

.sidebar-group__head--active {
  color: var(--c-brand);
}

.sidebar-group__title {
  flex: 1;
  font-size: $font-sm;
  font-weight: 600;
  @include ellipsis;
}

.sidebar-group__count {
  padding: 0 $space-xs;
  border-radius: $radius-full;
  background: var(--c-bg-sunken);
  font-size: $font-xs;
  color: var(--c-text-subtle);
}

.sidebar-group__chevron {
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
  transition: transform 0.2s ease;
  color: var(--c-text-subtle);
}

.sidebar-group__chevron--open {
  transform: rotate(180deg);
}

// ---- 折叠动画 ----
.sidebar-group__body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.24s ease;
}

.sidebar-group__body--open {
  grid-template-rows: 1fr;
}

.sidebar-group__inner {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.sidebar-group__link {
  padding: $space-xs $space-sm $space-xs $space-lg;
  border-left: 2px solid transparent;
  font-size: $font-sm;
  line-height: 1.5;
  color: var(--c-text-muted);

  &:hover {
    color: var(--c-text);
    background: var(--c-hover);
    text-decoration: none;
  }
}

.sidebar-group__link--active {
  color: var(--c-brand);
  border-left-color: var(--c-brand);
  background: var(--c-hover);
}

.sidebar-group__empty {
  margin: 0;
  padding: $space-sm $space-sm $space-sm $space-lg;
  font-size: $font-xs;
  color: var(--c-text-subtle);
}
</style>

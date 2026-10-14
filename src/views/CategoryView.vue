<script setup lang="ts">
import { computed } from 'vue'
import QuestionList from '@/components/question/QuestionList.vue'
import { useContent } from '@/composables/useContent'

const props = defineProps<{ categoryId: string }>()

const { categories, categoryOf, questionsOf } = useContent()

const category = computed(() => categoryOf(props.categoryId))
const questions = computed(() => questionsOf(props.categoryId))
const otherCategories = computed(() => categories.value.filter((item) => item.id !== props.categoryId))
</script>

<template>
  <div class="category-view">
    <template v-if="category">
      <header class="category-view__head">
        <h1 class="category-view__title">{{ category.title }}</h1>
        <p class="category-view__desc">{{ category.desc }}</p>
        <p class="category-view__meta">
          共 {{ category.count }} 道题<template v-if="category.subtopics.length">，覆盖：{{ category.subtopics.join(' · ') }}</template>
        </p>
      </header>

      <QuestionList :questions="questions" />
    </template>

    <div v-else class="category-view__missing">
      <h1 class="category-view__title">分类不存在</h1>
      <p class="category-view__desc">没有找到 id 为「{{ categoryId }}」的分类。</p>
      <RouterLink to="/">返回首页</RouterLink>
    </div>

    <section v-if="otherCategories.length" class="category-view__others">
      <h2 class="category-view__others-title">其他分类</h2>
      <div class="category-view__others-list">
        <RouterLink
          v-for="item in otherCategories"
          :key="item.id"
          class="category-view__other"
          :to="{ name: 'category', params: { categoryId: item.id } }"
        >
          {{ item.title }}
          <span class="category-view__other-count">{{ item.count }}</span>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
// =============================================================================
// 分类页
// =============================================================================

.category-view {
  display: flex;
  flex-direction: column;
  gap: $space-xl;
}

.category-view__head {
  display: flex;
  flex-direction: column;
  gap: $space-sm;
  padding-bottom: $space-lg;
  border-bottom: 1px solid var(--c-border);
}

.category-view__title {
  font-size: $font-2xl;
}

.category-view__desc {
  max-width: 640px;
  color: var(--c-text-muted);
}

.category-view__meta {
  font-size: $font-sm;
  color: var(--c-text-subtle);
}

.category-view__missing {
  display: flex;
  flex-direction: column;
  gap: $space-sm;
  align-items: flex-start;
}

.category-view__others-title {
  margin-bottom: $space-md;
  font-size: $font-lg;
}

.category-view__others-list {
  display: flex;
  flex-wrap: wrap;
  gap: $space-sm;
}

.category-view__other {
  display: inline-flex;
  align-items: center;
  gap: $space-xs;
  padding: $space-xs $space-md;
  border: 1px solid var(--c-border);
  border-radius: $radius-full;
  font-size: $font-sm;
  color: var(--c-text-muted);

  &:hover {
    border-color: var(--c-brand);
    color: var(--c-brand);
    text-decoration: none;
  }
}

.category-view__other-count {
  font-size: $font-xs;
  color: var(--c-text-subtle);
}
</style>

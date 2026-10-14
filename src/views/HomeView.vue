<script setup lang="ts">
import { computed } from 'vue'
import DifficultyBadge from '@/components/common/DifficultyBadge.vue'
import { APP } from '@/config/app'
import { useContent } from '@/composables/useContent'

const { categories, questions } = useContent()

const highFrequency = computed(() => questions.value.filter((question) => question.frequency === 'high').slice(0, 6))
</script>

<template>
  <div class="home">
    <section class="home__hero">
      <h1 class="home__title">{{ APP.title }}</h1>
      <p class="home__subtitle">
        按「问题 → 参考答案 → 原理讲解」组织的前端面试题库，覆盖 JS 基础、HTML/CSS、浏览器与网络、Vue2、Vue3、React
        与工程化等常考方向。
      </p>

      <div class="home__stats">
        <div class="home__stat">
          <span class="home__stat-value">{{ questions.length }}</span>
          <span class="home__stat-label">题目总数</span>
        </div>
        <div class="home__stat">
          <span class="home__stat-value">{{ categories.length }}</span>
          <span class="home__stat-label">知识分类</span>
        </div>
        <div class="home__stat">
          <span class="home__stat-value">{{ highFrequency.length }}</span>
          <span class="home__stat-label">高频题目</span>
        </div>
      </div>
    </section>

    <section class="home__section">
      <h2 class="home__section-title">按分类浏览</h2>

      <div class="home__categories">
        <RouterLink
          v-for="category in categories"
          :key="category.id"
          class="home__category"
          :to="{ name: 'category', params: { categoryId: category.id } }"
        >
          <div class="home__category-head">
            <h3 class="home__category-title">{{ category.title }}</h3>
            <span class="home__category-count">{{ category.count }}</span>
          </div>
          <p class="home__category-desc">{{ category.desc }}</p>
          <p v-if="category.subtopics.length" class="home__category-topics">
            {{ category.subtopics.slice(0, 4).join(' · ') }}
          </p>
        </RouterLink>
      </div>
    </section>

    <section v-if="highFrequency.length" class="home__section">
      <h2 class="home__section-title">高频必刷</h2>

      <div class="home__hot">
        <RouterLink
          v-for="question in highFrequency"
          :key="question.id"
          class="home__hot-item"
          :to="{ name: 'question', params: { categoryId: question.categoryId, questionId: question.id } }"
        >
          <DifficultyBadge :difficulty="question.difficulty" />
          <span class="home__hot-title">{{ question.title }}</span>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
// =============================================================================
// 首页
// =============================================================================

.home {
  display: flex;
  flex-direction: column;
  gap: $space-3xl;
}

.home__hero {
  padding: $space-2xl 0 $space-xl;
}

.home__title {
  font-size: $font-3xl;
  letter-spacing: -0.01em;
}

.home__subtitle {
  max-width: 680px;
  margin-top: $space-md;
  font-size: $font-lg;
  line-height: 1.7;
  color: var(--c-text-muted);
}

.home__stats {
  display: flex;
  gap: $space-2xl;
  margin-top: $space-xl;
}

.home__stat {
  display: flex;
  flex-direction: column;
}

.home__stat-value {
  font-size: $font-2xl;
  font-weight: 700;
  color: var(--c-brand);
}

.home__stat-label {
  font-size: $font-xs;
  color: var(--c-text-subtle);
}

.home__section-title {
  margin-bottom: $space-lg;
  font-size: $font-xl;
}

.home__categories {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: $space-md;
}

.home__category {
  display: flex;
  flex-direction: column;
  gap: $space-sm;
  padding: $space-lg;
  border: 1px solid var(--c-border);
  border-radius: $radius-md;
  background: var(--c-bg-elevated);
  color: inherit;
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    border-color: var(--c-brand);
    text-decoration: none;
  }
}

.home__category-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-sm;
}

.home__category-title {
  font-size: $font-lg;
}

.home__category-count {
  padding: 0 $space-sm;
  border-radius: $radius-full;
  background: var(--c-brand-soft);
  font-size: $font-xs;
  color: var(--c-brand);
}

.home__category-desc {
  font-size: $font-sm;
  color: var(--c-text-muted);
}

.home__category-topics {
  font-size: $font-xs;
  color: var(--c-text-subtle);
  @include line-clamp(2);
}

.home__hot {
  display: flex;
  flex-direction: column;
  gap: $space-xs;
}

.home__hot-item {
  display: flex;
  align-items: center;
  gap: $space-sm;
  padding: $space-md $space-lg;
  border: 1px solid var(--c-border);
  border-radius: $radius-md;
  background: var(--c-bg-elevated);
  color: inherit;

  &:hover {
    border-color: var(--c-brand);
    text-decoration: none;
  }
}

.home__hot-title {
  font-size: $font-sm;
  font-weight: 500;
}
</style>

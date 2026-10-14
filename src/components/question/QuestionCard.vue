<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTag from '@/components/common/BaseTag.vue'
import DifficultyBadge from '@/components/common/DifficultyBadge.vue'
import AnswerPanel from '@/components/question/AnswerPanel.vue'
import { FREQUENCY_LABEL } from '@/config/app'
import type { Question } from '@/content/types'

defineProps<{ question: Question }>()

const isExpanded = ref(false)
const hasOpened = ref(false)

function toggle(): void {
  isExpanded.value = !isExpanded.value
  if (isExpanded.value) hasOpened.value = true
}
</script>

<template>
  <article class="question-card" :class="{ 'question-card--expanded': isExpanded }">
    <header class="question-card__head">
      <h3 class="question-card__title">{{ question.title }}</h3>

      <div class="question-card__meta">
        <DifficultyBadge :difficulty="question.difficulty" />
        <BaseTag :label="FREQUENCY_LABEL[question.frequency]" tone="brand" />
        <BaseTag v-if="question.subtopic" :label="question.subtopic" tone="muted" />
      </div>

      <BaseButton
        class="question-card__toggle"
        size="sm"
        :variant="isExpanded ? 'ghost' : 'primary'"
        @click="toggle"
      >
        {{ isExpanded ? '收起答案' : '查看答案' }}
      </BaseButton>
    </header>

    <div v-if="question.stem" class="question-card__stem">
      <AnswerPanel :body="question.stem" :cache-key="`${question.id}:stem`" />
    </div>

    <div class="question-card__body" :class="{ 'question-card__body--open': isExpanded }">
      <div class="question-card__body-inner">
        <div class="question-card__body-content">
          <AnswerPanel v-if="hasOpened" :body="question.body" :cache-key="`${question.id}:answer`" />
        </div>
      </div>
    </div>

    <footer class="question-card__foot">
      <div class="question-card__tags">
        <BaseTag v-for="tag in question.tags" :key="tag" :label="tag" tone="muted" />
      </div>

      <RouterLink
        class="question-card__detail"
        :to="{ name: 'question', params: { categoryId: question.categoryId, questionId: question.id } }"
      >
        查看详情 →
      </RouterLink>
    </footer>
  </article>
</template>

<style scoped lang="scss">
// =============================================================================
// 题目卡片：默认只显示问题，展开后显示答案与讲解
// =============================================================================

.question-card {
  padding: $space-lg;
  border: 1px solid var(--c-border);
  border-radius: $radius-md;
  background: var(--c-bg-elevated);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    border-color: var(--c-border-strong);
  }
}

.question-card--expanded {
  border-color: var(--c-brand);
}

.question-card__head {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: $space-sm $space-md;
  align-items: start;
}

.question-card__title {
  font-size: $font-lg;
  font-weight: 600;
}

.question-card__meta {
  display: flex;
  flex-wrap: wrap;
  grid-column: 1 / 2;
  gap: $space-xs;
}

.question-card__toggle {
  grid-row: 1 / 3;
  grid-column: 2 / 3;
  align-self: start;
  white-space: nowrap;

  @include media($bp-sm) {
    grid-row: 3 / 4;
    grid-column: 1 / 3;
    justify-self: start;
  }
}

// ---- 题干 ----
.question-card__stem {
  margin-top: $space-md;
}

// ---- 折叠动画：0fr → 1fr ----
.question-card__body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.28s ease;
}

.question-card__body--open {
  grid-template-rows: 1fr;
}

.question-card__body-inner {
  min-height: 0;
  overflow: hidden;
}

.question-card__body-content {
  padding-top: $space-lg;
  border-top: 1px solid var(--c-border);
}

// ---- 底部信息 ----
.question-card__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: $space-sm;
  margin-top: $space-md;
}

.question-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: $space-xs;
}

.question-card__detail {
  font-size: $font-sm;
  white-space: nowrap;
}
</style>

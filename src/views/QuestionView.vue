<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTag from '@/components/common/BaseTag.vue'
import DifficultyBadge from '@/components/common/DifficultyBadge.vue'
import AnswerPanel from '@/components/question/AnswerPanel.vue'
import { FREQUENCY_LABEL } from '@/config/app'
import { useContent } from '@/composables/useContent'

const props = defineProps<{
  categoryId: string
  questionId: string
}>()

const { categoryOf, questionOf, questionsOf } = useContent()

const question = computed(() => questionOf(props.questionId))
const category = computed(() => categoryOf(props.categoryId))
const siblings = computed(() => questionsOf(props.categoryId))
const position = computed(() => siblings.value.findIndex((item) => item.id === props.questionId))
const previous = computed(() => (position.value > 0 ? siblings.value[position.value - 1] : undefined))
const next = computed(() =>
  position.value >= 0 && position.value < siblings.value.length - 1 ? siblings.value[position.value + 1] : undefined,
)
const relatedQuestions = computed(() =>
  (question.value?.related ?? []).map((id) => questionOf(id)).filter((item) => item !== undefined),
)

const isExpanded = ref(false)
const hasOpened = ref(false)

// 切换题目时收起答案
watch(
  () => props.questionId,
  () => {
    isExpanded.value = false
    hasOpened.value = false
  },
)

function toggle(): void {
  isExpanded.value = !isExpanded.value
  if (isExpanded.value) hasOpened.value = true
}
</script>

<template>
  <div class="question-view">
    <template v-if="question">
      <!-- 面包屑 -->
      <nav class="question-view__breadcrumb">
        <RouterLink to="/">首页</RouterLink>
        <span class="question-view__separator">/</span>
        <RouterLink v-if="category" :to="{ name: 'category', params: { categoryId: category.id } }">
          {{ category.title }}
        </RouterLink>
      </nav>

      <!-- 问题 -->
      <header class="question-view__head">
        <h1 class="question-view__title">{{ question.title }}</h1>

        <div class="question-view__meta">
          <DifficultyBadge :difficulty="question.difficulty" />
          <BaseTag :label="FREQUENCY_LABEL[question.frequency]" tone="brand" />
          <BaseTag v-if="question.subtopic" :label="question.subtopic" tone="muted" />
          <BaseTag v-for="tag in question.tags" :key="tag" :label="tag" tone="muted" />
        </div>
      </header>

      <!-- 题干：始终展示 -->
      <section v-if="question.stem" class="question-view__stem">
        <AnswerPanel :body="question.stem" :cache-key="`${question.id}:stem`" />
      </section>

      <!-- 答案区：默认折叠，适合自测 -->
      <section class="question-view__answer">
        <div class="question-view__answer-head">
          <p class="question-view__hint">
            {{ isExpanded ? '下为标准答案与原理讲解' : '先自己想一想，再展开对照答案' }}
          </p>
          <BaseButton :variant="isExpanded ? 'ghost' : 'primary'" @click="toggle">
            {{ isExpanded ? '收起答案' : '展开答案与讲解' }}
          </BaseButton>
        </div>

        <div class="question-view__answer-body" :class="{ 'question-view__answer-body--open': isExpanded }">
          <div class="question-view__answer-inner">
            <div class="question-view__answer-content">
              <AnswerPanel v-if="hasOpened" :body="question.body" :cache-key="`${question.id}:answer`" />
            </div>
          </div>
        </div>
      </section>

      <!-- 相关题目 -->
      <section v-if="relatedQuestions.length" class="question-view__related">
        <h2 class="question-view__section-title">相关题目</h2>
        <div class="question-view__links">
          <RouterLink
            v-for="item in relatedQuestions"
            :key="item.id"
            class="question-view__link"
            :to="{ name: 'question', params: { categoryId: item.categoryId, questionId: item.id } }"
          >
            {{ item.title }}
          </RouterLink>
        </div>
      </section>

      <!-- 上一篇 / 下一篇 -->
      <nav class="question-view__pager">
        <RouterLink
          v-if="previous"
          class="question-view__pager-item"
          :to="{ name: 'question', params: { categoryId: previous.categoryId, questionId: previous.id } }"
        >
          <span class="question-view__pager-label">← 上一题</span>
          <span class="question-view__pager-title">{{ previous.title }}</span>
        </RouterLink>
        <span v-else class="question-view__pager-placeholder" />

        <RouterLink
          v-if="next"
          class="question-view__pager-item question-view__pager-item--next"
          :to="{ name: 'question', params: { categoryId: next.categoryId, questionId: next.id } }"
        >
          <span class="question-view__pager-label">下一题 →</span>
          <span class="question-view__pager-title">{{ next.title }}</span>
        </RouterLink>
      </nav>

      <p class="question-view__source">源文件：{{ question.path }}</p>
    </template>

    <div v-else class="question-view__missing">
      <h1 class="question-view__title">题目不存在</h1>
      <p>没有找到 id 为「{{ questionId }}」的题目。</p>
      <RouterLink to="/">返回首页</RouterLink>
    </div>
  </div>
</template>

<style scoped lang="scss">
// =============================================================================
// 题目详情页
// =============================================================================

.question-view {
  display: flex;
  flex-direction: column;
  gap: $space-xl;
}

.question-view__breadcrumb {
  display: flex;
  align-items: center;
  gap: $space-sm;
  font-size: $font-sm;
  color: var(--c-text-subtle);
}

.question-view__separator {
  color: var(--c-border-strong);
}

.question-view__head {
  display: flex;
  flex-direction: column;
  gap: $space-md;
  padding-bottom: $space-lg;
  border-bottom: 1px solid var(--c-border);
}

.question-view__title {
  font-size: $font-2xl;
  line-height: 1.4;
}

.question-view__meta {
  display: flex;
  flex-wrap: wrap;
  gap: $space-xs;
}

.question-view__stem {
  padding: $space-lg;
  border: 1px solid var(--c-border);
  border-left: 3px solid var(--c-brand);
  border-radius: $radius-md;
  background: var(--c-bg-elevated);
}

.question-view__answer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-md;
  margin-bottom: $space-lg;
}

.question-view__hint {
  font-size: $font-sm;
  color: var(--c-text-subtle);
}

.question-view__answer-body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.28s ease;
}

.question-view__answer-body--open {
  grid-template-rows: 1fr;
}

.question-view__answer-inner {
  min-height: 0;
  overflow: hidden;
}

.question-view__answer-content {
  padding: $space-lg;
  border: 1px solid var(--c-border);
  border-radius: $radius-md;
  background: var(--c-bg-elevated);
}

.question-view__section-title {
  margin-bottom: $space-md;
  font-size: $font-lg;
}

.question-view__links {
  display: flex;
  flex-direction: column;
  gap: $space-xs;
}

.question-view__link {
  padding: $space-sm $space-md;
  border: 1px solid var(--c-border);
  border-radius: $radius-sm;
  font-size: $font-sm;
  color: var(--c-text-muted);

  &:hover {
    border-color: var(--c-brand);
    color: var(--c-brand);
    text-decoration: none;
  }
}

.question-view__pager {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-md;
  padding-top: $space-lg;
  border-top: 1px solid var(--c-border);
}

.question-view__pager-item {
  display: flex;
  flex-direction: column;
  gap: $space-2xs;
  padding: $space-md;
  border: 1px solid var(--c-border);
  border-radius: $radius-md;
  color: var(--c-text);

  &:hover {
    border-color: var(--c-brand);
    text-decoration: none;
  }
}

.question-view__pager-item--next {
  text-align: right;
}

.question-view__pager-label {
  font-size: $font-xs;
  color: var(--c-text-subtle);
}

.question-view__pager-title {
  font-size: $font-sm;
  @include line-clamp(2);
}

.question-view__pager-placeholder {
  display: block;
}

.question-view__source {
  font-family: $font-mono;
  font-size: $font-xs;
  color: var(--c-text-subtle);
  word-break: break-all;
}

.question-view__missing {
  display: flex;
  flex-direction: column;
  gap: $space-sm;
  align-items: flex-start;
}
</style>

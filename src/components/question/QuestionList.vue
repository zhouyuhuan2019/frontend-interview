<script setup lang="ts">
import QuestionCard from '@/components/question/QuestionCard.vue'
import type { Question } from '@/content/types'

defineProps<{ questions: Question[] }>()
</script>

<template>
  <div class="question-list">
    <QuestionCard v-for="question in questions" :key="question.id" :question="question" />

    <p v-if="!questions.length" class="question-list__empty">该分类下暂无题目，可在 content/ 目录下新建 Markdown 文件补充。</p>
  </div>
</template>

<style scoped lang="scss">
// =============================================================================
// 题目列表
// =============================================================================

.question-list {
  display: flex;
  flex-direction: column;
  gap: $space-md;
}

.question-list__empty {
  padding: $space-xl;
  border: 1px dashed var(--c-border-strong);
  border-radius: $radius-md;
  text-align: center;
  font-size: $font-sm;
  color: var(--c-text-subtle);
}
</style>

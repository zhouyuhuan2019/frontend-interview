<script setup lang="ts">
import { computed } from 'vue'
import BaseTag from '@/components/common/BaseTag.vue'
import { DIFFICULTY_LABEL } from '@/config/app'
import type { Difficulty } from '@/content/types'

const props = defineProps<{ difficulty: Difficulty }>()

const label = computed(() => DIFFICULTY_LABEL[props.difficulty] ?? props.difficulty)
</script>

<template>
  <BaseTag :label="label" :tone="difficulty" />
</template>

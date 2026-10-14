<script setup lang="ts">
// 404 页面
</script>

<template>
  <div class="not-found">
    <h1 class="not-found__title">页面不存在</h1>
    <p class="not-found__desc">你访问的地址没有对应的内容。</p>
    <RouterLink class="not-found__link" to="/">返回首页</RouterLink>
  </div>
</template>

<style scoped lang="scss">
// =============================================================================
// 404
// =============================================================================

.not-found {
  display: flex;
  flex-direction: column;
  gap: $space-sm;
  align-items: flex-start;
  padding: $space-3xl 0;
}

.not-found__title {
  font-size: $font-2xl;
}

.not-found__desc {
  color: var(--c-text-muted);
}

.not-found__link {
  font-size: $font-sm;
}
</style>

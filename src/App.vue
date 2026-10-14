<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppDrawer from '@/components/common/AppDrawer.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { ensureHighlighter } from '@/composables/useShiki'
import { useSidebar } from '@/composables/useSidebar'

const router = useRouter()
const { isMobile, isDrawerOpen, closeDrawer } = useSidebar()

// 移动端点击目录跳转后自动收起抽屉
router.afterEach(() => {
  closeDrawer()
})

// 预热代码高亮器：不阻塞首屏，进入题目时通常已就绪
void ensureHighlighter()
</script>

<template>
  <div class="app">
    <AppHeader />

    <div class="app__body">
      <AppSidebar v-if="!isMobile" class="app__sidebar" />

      <main class="app__main">
        <RouterView />
      </main>
    </div>

    <AppDrawer v-if="isMobile" :open="isDrawerOpen" @close="closeDrawer">
      <AppSidebar />
    </AppDrawer>
  </div>
</template>

<style scoped lang="scss">
// =============================================================================
// 应用外壳：顶部导航 + 左侧目录 + 主内容区
// =============================================================================

.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app__body {
  display: flex;
  flex: 1;
  gap: $space-2xl;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 $space-xl;

  @include media($bp-md) {
    gap: 0;
    padding: 0 $space-lg;
  }

  @include media($bp-sm) {
    padding: 0 $space-md;
  }
}

.app__sidebar {
  flex: 0 0 $sidebar-width;
  position: sticky;
  top: $header-height;
  align-self: flex-start;
  max-height: calc(100vh - #{$header-height});
  padding: $space-xl 0 $space-3xl;
  overflow-y: auto;

  @include media($bp-md) {
    display: none;
  }
}

.app__main {
  flex: 1;
  min-width: 0;
  max-width: $content-max-width;
  padding: $space-xl 0 $space-3xl;

  @include media($bp-sm) {
    padding: $space-lg 0 $space-2xl;
  }
}
</style>

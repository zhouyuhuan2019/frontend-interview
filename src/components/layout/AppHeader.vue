<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside, watchDebounced } from '@vueuse/core'
import { useRouter } from 'vue-router'
import BaseSearch from '@/components/common/BaseSearch.vue'
import DifficultyBadge from '@/components/common/DifficultyBadge.vue'
import { APP } from '@/config/app'
import { useContent } from '@/composables/useContent'
import { searchQuestions } from '@/composables/useSearch'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import type { SearchHit } from '@/content/types'

const router = useRouter()
const { isDark, toggleDark } = useTheme()
const { isMobile, toggleDrawer } = useSidebar()
const { categoryOf, questions } = useContent()

const keyword = ref('')
const hits = ref<SearchHit[]>([])
const isSearchPanelOpen = ref(false)
const searchRef = ref<HTMLElement | null>(null)

// 输入去抖后再检索，避免每次按键都跑一遍索引
watchDebounced(
  keyword,
  (value) => {
    const query = value.trim()
    if (!query) {
      hits.value = []
      isSearchPanelOpen.value = false
      return
    }
    hits.value = searchQuestions(query)
    isSearchPanelOpen.value = true
  },
  { debounce: APP.searchDebounceMs },
)

// 点击搜索区域外时收起结果面板
onClickOutside(searchRef, () => {
  isSearchPanelOpen.value = false
})

function openResult(hit: SearchHit): void {
  keyword.value = ''
  hits.value = []
  isSearchPanelOpen.value = false
  void router.push({
    name: 'question',
    params: { categoryId: hit.categoryId, questionId: hit.id },
  })
}
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <button v-if="isMobile" class="app-header__icon-button" type="button" aria-label="打开题目目录" @click="toggleDrawer">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>

      <RouterLink class="app-header__brand" to="/">
        <span class="app-header__logo">FI</span>
        <span class="app-header__titles">
          <span class="app-header__title">{{ APP.title }}</span>
          <span class="app-header__subtitle">{{ questions.length }} 道题目 · {{ APP.subtitle }}</span>
        </span>
      </RouterLink>

      <div ref="searchRef" class="app-header__search">
        <BaseSearch v-model="keyword" placeholder="搜索题目、标签或关键词" />

        <div v-if="isSearchPanelOpen" class="app-header__panel">
          <p v-if="!hits.length" class="app-header__empty">没有匹配的题目</p>

          <button
            v-for="hit in hits"
            :key="hit.id"
            class="app-header__hit"
            type="button"
            @click="openResult(hit)"
          >
            <span class="app-header__hit-head">
              <span class="app-header__hit-title">{{ hit.title }}</span>
              <DifficultyBadge :difficulty="hit.difficulty" />
            </span>
            <span class="app-header__hit-meta">{{ categoryOf(hit.categoryId)?.title ?? hit.categoryId }}</span>
            <span class="app-header__hit-snippet">{{ hit.snippet }}</span>
          </button>
        </div>
      </div>

      <button class="app-header__icon-button" type="button" :aria-label="isDark ? '切换到浅色主题' : '切换到深色主题'" @click="toggleDark()">
        <svg v-if="isDark" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped lang="scss">
// =============================================================================
// 顶部导航
// =============================================================================

.app-header {
  position: sticky;
  top: 0;
  z-index: $z-header;
  border-bottom: 1px solid var(--c-border);
  background: color-mix(in srgb, var(--c-bg-elevated) 88%, transparent);
  backdrop-filter: blur(8px);
}

.app-header__inner {
  display: flex;
  align-items: center;
  gap: $space-md;
  width: 100%;
  max-width: 1400px;
  height: $header-height;
  margin: 0 auto;
  padding: 0 $space-xl;

  @include media($bp-md) {
    padding: 0 $space-lg;
  }
}

.app-header__brand {
  display: flex;
  align-items: center;
  gap: $space-sm;
  color: inherit;

  &:hover {
    text-decoration: none;
  }
}

.app-header__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: $radius-sm;
  background: var(--c-brand);
  color: #fff;
  font-size: $font-xs;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.app-header__titles {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.app-header__title {
  font-size: $font-md;
  font-weight: 600;
}

.app-header__subtitle {
  font-size: $font-xs;
  color: var(--c-text-subtle);

  @include media($bp-md) {
    display: none;
  }
}

.app-header__search {
  position: relative;
  flex: 1;
  max-width: 420px;
  margin-left: auto;
}

.app-header__panel {
  position: absolute;
  top: calc(100% + #{$space-sm});
  right: 0;
  left: 0;
  z-index: $z-header;
  max-height: 60vh;
  padding: $space-xs;
  border: 1px solid var(--c-border);
  border-radius: $radius-md;
  overflow-y: auto;
  background: var(--c-bg-elevated);
  box-shadow: var(--c-shadow);
}

.app-header__empty {
  margin: 0;
  padding: $space-lg $space-md;
  text-align: center;
  font-size: $font-sm;
  color: var(--c-text-subtle);
}

.app-header__hit {
  display: flex;
  flex-direction: column;
  gap: $space-2xs;
  width: 100%;
  padding: $space-sm $space-md;
  border-radius: $radius-sm;
  text-align: left;

  &:hover {
    background: var(--c-hover);
  }
}

.app-header__hit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-sm;
}

.app-header__hit-title {
  font-size: $font-sm;
  font-weight: 600;
  @include ellipsis;
}

.app-header__hit-meta {
  font-size: $font-xs;
  color: var(--c-brand);
}

.app-header__hit-snippet {
  font-size: $font-xs;
  color: var(--c-text-subtle);
  @include line-clamp(2);
}

.app-header__icon-button {
  display: flex;
  flex: 0 0 32px;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: $radius-sm;
  color: var(--c-text-muted);

  &:hover {
    color: var(--c-text);
    background: var(--c-hover);
  }

  &:focus-visible {
    @include focus-ring;
  }

  svg {
    width: 18px;
    height: 18px;
  }
}
</style>

<script setup lang="ts">
import { onKeyStroke, useScrollLock } from '@vueuse/core'
import { watch } from 'vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

// 抽屉打开时锁定页面滚动
const isScrollLocked = useScrollLock(document.body)

watch(
  () => props.open,
  (open) => {
    isScrollLocked.value = open
  },
)

onKeyStroke('Escape', () => {
  if (props.open) emit('close')
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="app-drawer" role="dialog" aria-modal="true" aria-label="题目目录">
      <div class="app-drawer__mask" @click="emit('close')" />

      <aside class="app-drawer__panel">
        <div class="app-drawer__head">
          <span class="app-drawer__title">题目目录</span>
          <button class="app-drawer__close" type="button" aria-label="关闭目录" @click="emit('close')">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <div class="app-drawer__body">
          <slot />
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
// =============================================================================
// 移动端抽屉
// =============================================================================

.app-drawer {
  position: fixed;
  inset: 0;
  z-index: $z-drawer;
}

.app-drawer__mask {
  position: absolute;
  inset: 0;
  z-index: $z-mask;
  background: rgba(15, 19, 25, 0.45);
  animation: app-drawer-fade 0.18s ease;
}

.app-drawer__panel {
  position: absolute;
  top: 0;
  left: 0;
  z-index: $z-drawer;
  display: flex;
  flex-direction: column;
  width: min(84vw, 320px);
  height: 100%;
  background: var(--c-bg-elevated);
  box-shadow: var(--c-shadow);
  animation: app-drawer-slide 0.22s ease;
}

.app-drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: $header-height;
  padding: 0 $space-lg;
  border-bottom: 1px solid var(--c-border);
}

.app-drawer__title {
  font-size: $font-md;
  font-weight: 600;
}

.app-drawer__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: $radius-sm;
  color: var(--c-text-muted);

  &:hover {
    color: var(--c-text);
    background: var(--c-hover);
  }

  svg {
    width: 16px;
    height: 16px;
  }
}

.app-drawer__body {
  flex: 1;
  padding: $space-lg;
  overflow-y: auto;
}

@keyframes app-drawer-fade {
  from {
    opacity: 0;
  }
}

@keyframes app-drawer-slide {
  from {
    transform: translateX(-100%);
  }
}
</style>

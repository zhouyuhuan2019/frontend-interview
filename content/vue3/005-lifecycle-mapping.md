---
title: Vue3 与 Vue2 生命周期钩子怎么对照？
subtopic: 生命周期对照
difficulty: junior
frequency: medium
tags: [Vue3, Vue2, 生命周期, setup, 迁移]
order: 50
---

## 参考答案

Vue3 的组合式生命周期基本就是在 Vue2 钩子名前加 `on`，且 `beforeCreate` / `created` 被 `setup` 取代：

| Vue2（选项式） | Vue3（组合式） | 说明 |
| --- | --- | --- |
| `beforeCreate` | —— | 用 `setup` 本身替代 |
| `created` | —— | 用 `setup` 本身替代 |
| `beforeMount` | `onBeforeMount` | DOM 挂载前 |
| `mounted` | `onMounted` | DOM 挂载完成，可操作 DOM |
| `beforeUpdate` | `onBeforeUpdate` | 响应式数据变化、DOM 更新前 |
| `updated` | `onUpdated` | DOM 更新后 |
| `beforeDestroy` | `onBeforeUnmount` | 注意改名：Destroy → Unmount |
| `destroyed` | `onUnmounted` | 组件卸载后，清理定时器 / 事件监听 |
| `activated` | `onActivated` | `<keep-alive>` 激活 |
| `deactivated` | `onDeactivated` | `<keep-alive>` 失活 |
| `errorCaptured` | `onErrorCaptured` | 捕获子孙组件错误 |

Vue3 新增：`onRenderTracked` / `onRenderTriggered`（调试响应式依赖用）、`onServerPrefetch`（SSR）。

## 原理讲解

为什么 `beforeCreate` 和 `created` 没有组合式版本？因为 `setup` 的执行时机就是在这两个钩子之间——组件实例创建后、DOM 挂载前。原来写在这两个钩子中的初始化代码，直接写在 `setup` 顶层即可：

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// 顶层代码 ≈ Vue2 的 created
const count = ref(0)
const timer = setInterval(() => count.value++, 1000)

onMounted(() => {
  // DOM 已挂载，可以安全访问 template ref
  console.log('DOM 就绪')
})

onUnmounted(() => {
  // 替代 Vue2 的 destroyed：清理副作用
  clearInterval(timer)
})
</script>
```

两个注意点：

1. **命名变化**：`beforeDestroy` → `onBeforeUnmount`，`destroyed` → `onUnmounted`。Vue3 强调「卸载」而非「销毁」，因为组件实例随渲染效应自动回收。选项式写法下 `beforeUnmount` / `unmounted` 是新名字（旧名作为别名仍兼容，不推荐新代码使用）。
2. **注册方式**：组合式钩子是**函数调用**，依赖「当前组件实例」上下文，只能在 `setup` 或 `<script setup>` 的**同步顶层作用域**调用；`await` 之后或普通回调里调用会报 `onXxx is called when there is no active component instance` 警告。

执行顺序（父子组件）：挂载时 `父 setup → 父 onBeforeMount → 子 setup → 子 onMounted → 父 onMounted`；卸载时子组件先卸载，父组件后卸载。

## 追问与易错点

- **`setup` 里能拿到 `this` 吗？** 不能，`setup` 执行时组件实例尚未完全建立，`this` 是 `undefined`；确需实例可用 `getCurrentInstance()`，但业务代码不建议依赖。
- **父组件的 `onMounted` 里一定能拿到子组件 DOM 吗？** 普通情况可以（子先挂载）；但子组件若有异步渲染（`Suspense`、异步组件）则不保证。
- **同一个钩子能注册多次吗？** 可以，多个回调按注册顺序依次执行——这正是组合式函数能各自注册清理逻辑的基础。
- **Vue2 项目迁移到 Vue3 生命周期要改哪里？** `beforeDestroy` → `beforeUnmount`、`destroyed` → `unmounted`；其余名字不变、行为一致。

## 相关题目

- [vue3-002-composition-api](/q/vue3/vue3-002-composition-api)

---
title: Vue2 生命周期有哪些阶段？created 与 mounted 的区别？
subtopic: 生命周期
difficulty: junior
frequency: high
tags: [Vue2, 生命周期, created, mounted, 钩子函数]
order: 20
related: [vue2-001-reactivity-principle]
---

## 参考答案

Vue2 组件从创建到销毁有 **8 个常用钩子**，分四个阶段：

| 阶段 | 钩子 | 触发时机 |
|---|---|---|
| 创建 | `beforeCreate` | 实例初始化后，data / methods 尚未就绪 |
| 创建 | `created` | data / methods 可用，**DOM 尚未生成** |
| 挂载 | `beforeMount` | 模板编译完成，即将渲染到页面 |
| 挂载 | `mounted` | **DOM 已生成**，`this.$el` 可访问 |
| 更新 | `beforeUpdate` / `updated` | 响应式数据变化导致重新渲染前后 |
| 销毁 | `beforeDestroy` / `destroyed` | 实例销毁前后 |

**created 与 mounted 的核心区别**：

| 对比项 | created | mounted |
|---|---|---|
| DOM | 未生成，`$el` 为 undefined | 已生成，`$el` 可访问 |
| 数据 | 可访问 data / methods | 可访问 |
| 典型用途 | 初始化数据、发请求 | 操作 DOM、初始化第三方库（ECharts 等） |
| SSR | 会执行 | **不会执行**（服务端无 DOM） |

## 原理讲解

一个最小示例感受执行顺序：

```vue
<script>
export default {
  data() {
    return { msg: 'hello' }
  },
  beforeCreate() {
    console.log('beforeCreate', this.msg) // undefined
  },
  created() {
    console.log('created', this.msg) // 'hello'
  },
  beforeMount() {
    console.log('beforeMount', this.$el) // undefined
  },
  mounted() {
    console.log('mounted', this.$el) // <div>…</div>
  },
}
</script>
```

几个关键点：

1. `created` 时响应式系统已初始化完成（data 已被 `defineProperty` 代理），可以安全读写数据、发请求；此时发请求比 `mounted` 更早发出，能缩短整体耗时。
2. `mounted` 只保证**当前组件自身**的 DOM 挂载完成，不保证所有子组件都挂载完；要等整个视图渲染完可用 `this.$nextTick`。
3. 被 `<keep-alive>` 缓存的组件会多出 `activated` / `deactivated` 两个钩子，再次进入时不会重新走 `created` / `mounted`。
4. 销毁阶段常做收尾：清定时器、解绑全局事件、取消未完成的请求。

## 追问与易错点

- **在哪个钩子里发请求最好？** 一般在 `created`：数据已可写且比 `mounted` 更早发出；只有依赖 DOM 的操作才放 `mounted`。
- **父子组件的钩子执行顺序？** 挂载阶段为 `父 beforeCreate → 父 created → 父 beforeMount → 子 created → 子 mounted → 父 mounted`，即父组件的 `mounted` 在子组件挂载完之后触发。
- **`mounted` 里能拿到子组件的 `$refs` 吗？** 同步渲染时可以；若子组件是异步组件或条件渲染，需要 `$nextTick` 等渲染完成。
- **`beforeDestroy` 里忘了清定时器会怎样？** 定时器回调仍持有组件实例，造成内存泄漏，还会在已销毁实例上修改数据。

## 相关题目

- [vue2-001-reactivity-principle](/q/vue2/vue2-001-reactivity-principle)
- [vue2-007-nexttick](/q/vue2/vue2-007-nexttick)

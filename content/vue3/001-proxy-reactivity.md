---
title: Vue3 为什么改用 Proxy 实现响应式？
subtopic: 响应式原理
difficulty: middle
frequency: high
tags: [Vue3, Proxy, 响应式, Reflect, 惰性代理]
order: 10
---

## 参考答案

`Proxy` 直接代理整个对象，因此天生解决了 Vue2 的三个痛点：

| 能力 | Vue2（defineProperty） | Vue3（Proxy） |
| --- | --- | --- |
| 新增 / 删除属性 | 需要 `Vue.set` | 原生支持 |
| 数组下标赋值、`length` 修改 | 不支持 | 原生支持 |
| 初始化开销 | 递归遍历所有属性 | 惰性，访问到才代理 |
| 拦截能力 | 只有 get / set 等有限几种 | 13 种（`has`、`deleteProperty`、`ownKeys`…） |
| Map / Set | 不支持 | 支持 |

配合 `Reflect` 使用可以保持默认行为并拿到正确的返回值：

```js
const state = new Proxy(target, {
  get(target, key, receiver) {
    track(target, key)                 // 收集依赖
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    const result = Reflect.set(target, key, value, receiver)
    trigger(target, key)               // 派发更新
    return result
  },
})
```

## 原理讲解

Vue3 的响应式系统由三部分构成：`reactive` / `ref`（创建代理）、`effect`（副作用，即渲染与 watch）、`track` / `trigger`（依赖收集与派发）。

依赖关系用 `WeakMap<target, Map<key, Set<effect>>>` 存储：

- 第一层 `WeakMap` 的键是原始对象，**弱引用**，对象被回收时依赖自动释放；
- 第二层 `Map` 的键是属性名；
- 第三层 `Set` 存所有订阅该属性的 effect。

`WeakMap` 的选择很关键：如果用 `Map`，被代理过的对象即使业务上不再使用也无法回收，等价于内存泄漏。

`ref` 与 `reactive` 的分工：
- `reactive` 只能用于对象 / 数组 / Map / Set，解构会丢失响应性；
- `ref` 用一个 `{ value }` 包装任意类型，因此**可以传递、可以解构**，模板中会自动解包。

## 追问与易错点

- **`Proxy` 有什么兼容性问题？** 无法 polyfill，因此 Vue3 不支持 IE11（Vue2.7 是最后支持 IE 的版本）。
- **为什么 `Reactive` 对象解构后不响应？** 解构读到的是一次性的值，丢失了 getter 的触发路径；解法是用 `toRefs` / `toRef`。
- **`shallowRef` 和 `ref` 的区别？** `shallowRef` 只跟踪 `.value` 的整体替换，不深度代理内部属性，适合存大对象或第三方实例。
- **`ref` 在模板里为什么不用写 `.value`？** 模板编译阶段会自动解包顶层 ref，脚本里必须显式写 `.value`。

```js run
// 用 Proxy 手写一个最小响应式：验证「新增属性也能被感知」
const effects = new Set()
function trackEffect(effect) {
  effects.add(effect)
}

const state = new Proxy({ count: 0 }, {
  set(target, key, value) {
    target[key] = value
    effects.forEach((effect) => effect())
    return true
  },
})

trackEffect(() => console.log('count 变化：', state.count))
state.count = 1
state.newKey = '新增属性同样触发' // Vue2 做不到
```

## 相关题目

- [vue2-001-reactivity-principle](/q/vue2/vue2-001-reactivity-principle)

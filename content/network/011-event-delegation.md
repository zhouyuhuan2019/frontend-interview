---
title: 事件冒泡、捕获与事件委托是什么？
subtopic: 事件机制
difficulty: junior
frequency: high
tags: [事件冒泡, 事件捕获, 事件委托, addEventListener]
order: 110
related: [network-010-storage]
---

## 参考答案

DOM 事件流分三个阶段：**捕获（根 → 目标）→ 目标 → 冒泡（目标 → 根）**。`addEventListener` 第三个参数传 `true` 监听捕获阶段，默认（`false`）监听冒泡阶段。

**事件委托**：利用冒泡机制，把子元素的监听器统一挂到公共祖先上，通过 `event.target` 判断真正触发的元素。两大好处：

1. 监听器数量从 N 个减到 1 个，省内存；
2. 动态新增的子元素**天然受管**，无需重复绑定。

用纯 JS 模拟三阶段的执行顺序：

```text output
capture: root
target: li
bubble: ul
bubble: root
```

## 原理讲解

真实的 DOM 写法（事件委托的典型场景——列表项点击）：

```js
document.querySelector('#list').addEventListener('click', (e) => {
  const li = e.target.closest('li') // 点击的可能是 li 里的 span，向上找
  if (!li || !e.currentTarget.contains(li)) return
  console.log('点击了：', li.dataset.id)
})
```

下面用纯 JS 构建一棵 `root > ul > li` 的树，模拟浏览器「捕获 → 目标 → 冒泡」的分发过程：

```js run
function createNode(name, parent) {
  const node = { name, parent, children: [], listeners: [] }
  if (parent) parent.children.push(node)
  return node
}

function listen(node, phase, fn) {
  node.listeners.push({ phase, fn })
}

function dispatch(target) {
  const path = []
  let cur = target
  while (cur) { path.unshift(cur); cur = cur.parent } // [root, ul, li]

  // 1. 捕获阶段：根到目标的父级，自上而下
  for (let i = 0; i < path.length - 1; i++) {
    path[i].listeners.filter(l => l.phase === 'capture')
      .forEach(l => l.fn(path[i].name, 'capture'))
  }
  // 2. 目标阶段：捕获和冒泡监听器都会触发（按注册顺序）
  target.listeners.forEach(l => l.fn(target.name, 'target'))
  // 3. 冒泡阶段：目标的父级到根，自下而上
  for (let i = path.length - 2; i >= 0; i--) {
    path[i].listeners.filter(l => l.phase === 'bubble')
      .forEach(l => l.fn(path[i].name, 'bubble'))
  }
}

const root = createNode('root', null)
const ul = createNode('ul', root)
const li = createNode('li', ul)

listen(root, 'capture', (n, p) => console.log(`${p}: ${n}`))
listen(ul, 'bubble', (n, p) => console.log(`${p}: ${n}`))
listen(li, 'bubble', (n, p) => console.log(`${p}: ${n}`))
listen(root, 'bubble', (n, p) => console.log(`${p}: ${n}`))

dispatch(li)
```

几个关键 API 的区别：

- `event.target`：**真正触发**事件的元素（整个流程中不变）；
- `event.currentTarget`：**当前正在执行**监听器的元素（随阶段变化，委托里常配合 `contains` 用）；
- `event.stopPropagation()`：阻止事件继续冒泡（或捕获），同元素上的其他监听器仍会执行；
- `event.stopImmediatePropagation()`：连同元素上剩下的监听器也一并阻止；
- `event.preventDefault()`：阻止默认行为（如 a 标签跳转、表单提交），**不影响传播**。

## 追问与易错点

- **所有事件都会冒泡吗？** 不是。`focus`/`blur`、`mouseenter`/`mouseleave`、`scroll` 等不冒泡；需要委托焦点事件时用会冒泡的 `focusin`/`focusout` 替代。
- **委托有什么缺点？** 事件对象一路冒泡，祖先上的监听器要对所有后代触发做判断，逻辑复杂时容易误判；且无法委托不冒泡的事件。
- **`e.target` 在委托里为什么可能不是想要的元素？** 点中的可能是子元素（如 li 里的图标），所以要 `closest` 向上匹配，并校验它确实在委托容器内。
- **捕获阶段有什么用？** 可以在事件到达目标之前拦截（比如全局埋点、权限拦截），配合 `stopPropagation` 能让目标根本收不到事件。
- **React 的事件委托还在 document 上吗？** React 17 之前统一委托到 `document`，17 起改为委托到 React 根容器，所以 React 里的 `stopPropagation` 阻止不了根容器之外的原生监听器。

## 相关题目

- [network-010-storage](/q/network/network-010-storage)
- [network-009-xss-csrf](/q/network/network-009-xss-csrf)

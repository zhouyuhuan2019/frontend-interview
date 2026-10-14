---
title: 动态表单或列表的增删改怎么做？key 与不可变更新要注意什么？
subtopic: 表单与列表
difficulty: middle
frequency: high
tags: [React, 动态列表, key, 不可变更新, 受控组件]
order: 190
related: [react-007-key, react-011-state-batching-async, react-012-controlled-uncontrolled]
---

一个可动态增删的「联系人」列表，每行一个输入框绑定 `name`。下面这份代码在删掉中间一行之后，后面输入框里的值会「串」到别的行，改输入框有时界面还不动：

```jsx
function ContactList() {
  const [list, setList] = useState([{ name: '张三' }, { name: '李四' }])

  const remove = (index) => {
    list.splice(index, 1) // 直接改原数组
    setList(list) // 引用没变，React 可能不更新
  }

  return list.map((item, index) => (
    <div key={index}> {/* index 做 key */}
      <input
        value={item.name}
        onChange={(e) => {
          item.name = e.target.value // 直接改对象
          setList(list)
        }}
      />
      <button onClick={() => remove(index)}>删除</button>
    </div>
  ))
}
```

请问：为什么删中间一行会数据串位？动态列表的增删改到底该怎么写？

## 参考答案

结论：这里叠了两个错误——**用 `index` 当 key** 导致 React 按位置复用组件 / 输入框，删除中间项后「谁是谁」就错位；**直接改原数组再 `setList(list)`** 引用没变，React 判定无更新。

正确姿势：

1. `key` 用**稳定唯一的 id**，不要用 index；
2. 用**不可变更新**——每次返回新数组（`[...list]` / `map` / `filter`），让引用变化触发渲染；
3. 受控 `input` 通过 `onChange` 用新数组回写，绝不直接改 `item.name`。

```jsx
function ContactList() {
  const [list, setList] = useState([{ id: 1, name: '张三' }, { id: 2, name: '李四' }])

  const handleChange = (id, name) =>
    setList((prev) => prev.map((it) => (it.id === id ? { ...it, name } : it)))

  const remove = (id) => setList((prev) => prev.filter((it) => it.id !== id))

  const add = () => setList((prev) => [...prev, { id: crypto.randomUUID(), name: '' }])

  return (
    <div>
      {list.map((item) => (
        <div key={item.id}>
          <input value={item.name} onChange={(e) => handleChange(item.id, e.target.value)} />
          <button onClick={() => remove(item.id)}>删除</button>
        </div>
      ))}
      <button onClick={add}>添加一行</button>
    </div>
  )
}
```

## 原理讲解

**现象**：删除列表中间的某行后，下面的输入框内容不对了；或者改了输入框，界面却纹丝不动。

**原因**：

- React 调和时用 `key` 判断「节点身份」。用 `index` 作 key，身份就和位置绑死：删掉第 1 项，原来的第 2 项 index 变成 0，React 认为「第 0 位还是原来那个组件」，于是复用了带内部状态的 DOM 节点，值就串了；
- `splice` / `item.name = x` 都是在**原地修改**，`setList(list)` 传的还是同一个引用，`Object.is` 判定相等，React 直接跳过更新。

**解决方案**：稳定 id + 不可变更新。先用纯函数把三个操作跑一遍：

```js run
// 不可变更新：增删改都返回新数组，绝不 push / splice 原数组
const addItem = (list, item) => [...list, item]
const removeById = (list, id) => list.filter((it) => it.id !== id)
const updateById = (list, id, patch) => list.map((it) => (it.id === id ? { ...it, ...patch } : it))

let list = []
list = addItem(list, { id: 1, name: '张三' })
list = addItem(list, { id: 2, name: '李四' })
list = updateById(list, 1, { name: '张三丰' })
list = removeById(list, 2)
console.log(JSON.stringify(list))
```

```text output
[{"id":1,"name":"张三丰"}]
```

要点整理成表：

| 操作 | 推荐写法 | 禁忌 |
| --- | --- | --- |
| 增 | `[...list, item]` | `list.push(item)` |
| 删 | `list.filter(it => it.id !== id)` | `list.splice(i, 1)` |
| 改 | `list.map(it => it.id === id ? { ...it, ...patch } : it)` | `item.name = x` |
| 渲染 | `key={item.id}` | `key={index}` |

**关于 key**：只要列表会增删、排序，就必须用稳定唯一 id；只有「纯静态、不增删不排序、子项无状态」的列表，用 index 才安全。如果数据暂时没有 id，可以在建立列表时生成一次并保存进数据里（如 `crypto.randomUUID()`）；千万别在渲染时用 `Math.random()`——那等于每次都是新节点，输入框会被整棵重建。

**关于受控组件**：`value` + `onChange` 成对出现才是受控组件。给 `input` 只写 `value` 不写 `onChange`，会变成「只读」且报警告；只写 `onChange` 不写 `value` 则是非受控，后续无法用 state 统一控制。

行内的字段校验、删除确认、拖拽排序都属于锦上添花，核心永远是「id 稳定 + 不可变更」。

## 追问与易错点

- **列表项没有 id 怎么办？** 建列表时生成一次唯一值并存进数据。关键是**同一次会话内不变、项间不重复**。
- **`setList(list)` 之后为什么界面没动？** 因为你改的是同一个数组引用。必须返回新引用，嵌套项也要逐层展开成新对象。
- **函数式更新 `setList(prev => ...)` 好在哪？** 它拿到的永远是最新 state，避免闭包读到旧值，在批量更新 / 异步回调里更稳。
- **深层嵌套的表单怎么更新？** 逐层展开最稳；层级很深时可用 `useReducer` 集中管理，或用 Immer 这类库保持「写法像可变、实质不可变」。
- **key 会影响性能吗？** 会。稳定 key 让 React 只做移动 / 插入，index key 在头部增删时会触发大面积原地更新，DOM 操作和状态错乱都随之而来。
- **删除后校验错误还残留怎么办？** 校验信息通常也按 id 存（如 `errors[id]`），删项时一并删掉，否则会残留到新项上。

## 相关题目

- [react-007-key](/q/react/react-007-key)
- [react-012-controlled-uncontrolled](/q/react/react-012-controlled-uncontrolled)
- [react-011-state-batching-async](/q/react/react-011-state-batching-async)

---
title: 受控组件与非受控组件怎么选？输入框为什么输了没反应？
subtopic: 表单与列表
difficulty: junior
frequency: high
tags: [React, 受控组件, 非受控组件, 表单, onChange]
order: 120
related: [react-011-state-batching-async, react-004-hooks-rules]
---

下面这个输入框，用户在里面打字却**一个字都进不去**，控制台还会报警告。请解释原因，并说明「受控」与「非受控」分别什么时候用：

```jsx
function App() {
  const [text, setText] = useState('')
  return <input value={text} /> // 输入框里打不进任何字
}
```

## 参考答案

结论：**给了 `value` 却没给 `onChange`**。`value` 把输入框的值钉死为 `text`（永远是 `''`），用户每敲一下，控件想改成新字符，但下一次渲染又被 state 抹回空 —— 于是「打字无反应」。React 会明确警告：

```text
You provided a `value` prop to a form field without an `onChange` handler. This will render a read-only field. If the field should be mutable use `defaultValue`. Otherwise, set either `onChange` or `readOnly`.
```

两种修法，对应两种组件形态：

```jsx
// 受控：值由 state 驱动，每次输入都回写 state
const [text, setText] = useState('')
<input value={text} onChange={(e) => setText(e.target.value)} />

// 非受控：值由 DOM 自己维护，通过 ref 读取，defaultValue 只作初始值
const inputRef = useRef(null)
<input defaultValue="初始值" ref={inputRef} />
// 需要时读取：inputRef.current.value
```

## 原理讲解

**现象**：输入无反应、并伴随 `read-only field` 警告。

**原因**：React 的 `<input>` 有两种数据归属方式：

- **受控（controlled）**：`value` 由 React 提供，是**唯一真相来源**。用户输入只是触发 `onChange`，必须由你手动 `setText` 把新值写回 state，输入框才会更新。缺少 `onChange`，输入就等于被丢弃。
- **非受控（uncontrolled）**：值由 DOM 节点自己保存，React 只在初始挂载时用 `defaultValue` 设一次，之后不再干预。需要读值时靠 `ref`。

用一段纯逻辑模拟「受控输入」：显示值永远来自 state，只有回写 state 才会变：

```js run
// 模拟「受控输入」：显示值 = state，用户输入只是「请求变更」
let displayValue = '' // 相当于 value={displayValue}
const setDisplayValue = (v) => {
  displayValue = v
}
const render = (label) => {
  console.log(`${label} 输入框显示 = ${JSON.stringify(displayValue)}`)
}

// 场景一：提供了 onChange，输入能写回 state
setDisplayValue('React')
render('受控 + onChange')

// 场景二：只给了 value、没有 onChange —— 输入被丢弃，显示值保持为空
displayValue = ''
render('受控 - onChange')
```

```text output
受控 + onChange 输入框显示 = "React"
受控 - onChange 输入框显示 = ""
```

**解决方案**：写 `value` 就必须配 `onChange`；如果只是想设个初值、不打算逐字监听，就用 `defaultValue` + `ref` 走非受控。

两种形态怎么选：

| | 受控 | 非受控 |
| --- | --- | --- |
| 值的来源 | React state | DOM 自身 |
| 读取方式 | 直接用 state | `ref.current.value` |
| 实时校验 / 联动 | 容易（每次输入都在 React 里） | 麻烦（要手动取 DOM） |
| 初始值 | `value`（配 onChange） | `defaultValue` |
| 代码量 | 多一些 | 少一些 |
| 典型场景 | 需要校验、联动、格式化、禁用提交 | 一次性取值、文件上传 `<input type="file" />`、集成第三方 DOM 库 |

注意：**`<input type="file" />` 天生只能是非受控**，因为出于安全考虑，它的 `value` 不允许被程序赋值；此时必须用 ref 读文件。

## 追问与易错点

- **`value={undefined}` 和受控冲突吗？** 会。`value` 从有值变成 `undefined` 时 React 会警告「组件在受控与非受控之间切换」，应始终稳定地给 `value` 或始终用 `defaultValue`。
- **想默认值又能改，`value` 行不行？** 不行。`value` 是持续控制的；要「可改的初值」用 `defaultValue`。
- **受控组件每次输入都重渲染，会卡吗？** 一般不会。输入场景本身就轻量；真有性能问题，可用非受控 + 受控的组合（如 `onChange` 里做防抖）。
- **`<textarea>` 的受控写法有什么不同？** 它用 `value` 属性而不是把内容写在标签里；同理 `<select>` 用 `value` + `onChange`。
- **为什么 `readOnly` 也能消除警告？** 因为警告的前提是「控件可变却没有更新路径」；显式声明 `readOnly` 就表示你不打算让它变。

## 相关题目

- [react-011-state-batching-async](/q/react/react-011-state-batching-async)
- [react-004-hooks-rules](/q/react/react-004-hooks-rules)

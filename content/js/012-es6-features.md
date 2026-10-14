---
title: ES6+ 常用新特性盘点（可选链/解构/Set/Map/Symbol）
subtopic: ES6+ 新特性
difficulty: junior
frequency: medium
tags: [ES6+, 解构, 可选链, Set与Map]
order: 120
related: [js-001-var-let-const, js-011-array-methods]
---

## 参考答案

面试常考的 ES6+ 特性可按四组记忆：

- **变量与函数**：`let/const` 块级作用域、箭头函数、默认参数、剩余参数、模板字符串。
- **数据操作**：解构赋值、展开运算符 `...`、可选链 `?.`、空值合并 `??`（ES2020）。
- **数据结构**：`Set`（唯一值集合）、`Map`（任意类型键）、`Symbol`（唯一标识）。
- **异步与模块化**：Promise、async/await、class、`import/export`。

## 原理讲解

解构与展开：

```js run
// 数组解构：一行交换变量
let a = 1, b = 2
;[a, b] = [b, a]
console.log(a, b) // 2 1

// 对象解构：支持重命名与默认值
const { name, age = 18 } = { name: '张三' }
console.log(name, age) // 张三 18

// 展开运算符：合并对象（注意是浅拷贝）
const merged = { ...{ x: 1 }, ...{ y: 2 } }
console.log(JSON.stringify(merged)) // {"x":1,"y":2}
```

可选链与空值合并：

```js run
const user = { profile: null }

console.log(user.profile?.age) // undefined：链路中断不报错
console.log(user.profile?.age ?? '未知') // '未知'

// ?? 与 || 的区别：?? 只认 null/undefined
console.log(0 || '默认') // '默认'：0 被当成 falsy
console.log(0 ?? '默认') // 0：保留
console.log('' ?? '默认') // ''：空串也保留
```

Set 与 Map：

```js run
// Set：一行数组去重
const unique = [...new Set([1, 2, 2, 3])]
console.log(unique) // [1, 2, 3]

// Map：键可以是任意类型，且保留插入顺序
const m = new Map()
const key = { id: 1 }
m.set(key, '对象作键')
m.set('a', 1)
console.log(m.get(key), m.size) // 对象作键 2
```

Symbol：

```js run
const s1 = Symbol('a')
const s2 = Symbol('a')
console.log(s1 === s2) // false：描述相同也互不相等

// 常用作对象的"隐藏"键，避免命名冲突
const obj = { [s1]: 'hidden', normal: 1 }
console.log(Object.keys(obj)) // ['normal']：Symbol 键不会被枚举到
```

## 追问与易错点

- **?? 与 || 的区别？** `??` 只在左侧为 `null/undefined` 时取右侧；`||` 遇到任何 falsy（`0`、`''`、`false`）都会替换，处理数值配置项时容易踩坑。
- **?. 能用在赋值左边吗？** 不能，`a?.b = 1` 是语法错误；可选链只用于读取属性与调用方法。
- **Map 和 Object 怎么选？** 键非字符串、频繁增删、需要 `size` 或按插入顺序遍历用 `Map`；固定结构、需要 JSON 序列化用 `Object`。
- **Set 能直接去重对象数组吗？** 不能，对象按引用判等。需按某字段用 `reduce/filter` 处理，或 `new Set(arr.map(JSON.stringify))` 这类变通。
- **展开运算符是深拷贝吗？** 不是，只拷贝第一层，嵌套对象仍共享引用；需要深拷贝可用 `structuredClone`。

## 相关题目

- [js-001-var-let-const](/q/js/js-001-var-let-const)
- [js-011-array-methods](/q/js/js-011-array-methods)

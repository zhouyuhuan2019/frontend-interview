---
title: 手写深拷贝？有哪些坑？
subtopic: 数组与对象
difficulty: middle
frequency: high
tags: [手写, 深拷贝, 循环引用, WeakMap, 递归]
order: 30
---

请实现一个 `deepClone` 函数，要求：

- 基本类型直接返回，对象 / 数组递归拷贝；
- 正确处理**循环引用**（不能栈溢出）；
- `Date`、`RegExp` 等特殊对象不能拷贝成普通对象；
- 保持原型之外的结构不变（面试场景不要求拷贝原型链）。

## 参考答案

```js run
function deepClone(target, map = new WeakMap()) {
  // 1. 基本类型 / 函数直接返回
  if (target === null || typeof target !== 'object') return target

  // 2. 循环引用：已经拷贝过的对象直接返回缓存
  if (map.has(target)) return map.get(target)

  // 3. 特殊对象单独处理
  if (target instanceof Date) return new Date(target.getTime())
  if (target instanceof RegExp) return new RegExp(target.source, target.flags)

  // 4. 数组 / 普通对象递归拷贝
  const clone = Array.isArray(target) ? [] : {}
  map.set(target, clone) // 先登记再递归，才能截断循环
  for (const key of Object.keys(target)) {
    clone[key] = deepClone(target[key], map)
  }
  return clone
}

// 测试 1：嵌套对象 + 数组 + Date
const source = {
  name: '张三',
  tags: ['前端', 'Vue'],
  birth: new Date('2000-01-01T00:00:00.000Z'),
  reg: /abc/gi,
  address: { city: '杭州' },
}
const cloned = deepClone(source)
cloned.address.city = '上海'
cloned.tags.push('React')
console.log('原对象不受影响:', source.address.city, source.tags.length)
console.log('Date 类型保持:', cloned.birth instanceof Date, cloned.birth === source.birth)
console.log('RegExp 类型保持:', cloned.reg instanceof RegExp, cloned.reg.flags)

// 测试 2：循环引用
const a = { name: 'a' }
a.self = a
const b = deepClone(a)
console.log('循环引用拷贝成功:', b.self === b, b.self !== a)
```

```text output
原对象不受影响: 杭州 2
Date 类型保持: true false
RegExp 类型保持: true gi
循环引用拷贝成功: true true
```

## 原理讲解

1. **递归终止条件**：`typeof target !== 'object'` 时直接返回。注意 `typeof null === 'object'`，必须先把 `null` 排除，否则会报错。
2. **循环引用处理**：用 `WeakMap` 记录「原对象 → 拷贝结果」的映射。递归前先 `map.set(target, clone)` 登记，之后遇到同一个对象直接返回缓存的 `clone`，既避免死循环，又能让拷贝后的图结构与原对象一致（共享引用仍是共享引用）。
3. **为什么用 WeakMap 而不是 Map / 普通对象**：WeakMap 的键是弱引用，函数结束后缓存可以被 GC，不会内存泄漏；普通对象做键会丢失引用信息。
4. **特殊对象**：`Date` / `RegExp` 没有可枚举的自有数据属性，直接 `for...in` 会拷贝成 `{}`，必须用构造函数重新创建。面试写这两种即可，工业级还要处理 `Map`、`Set`、`ArrayBuffer` 等。
5. **`Object.keys` 只遍历自有可枚举的字符串键**，Symbol 键需要 `Reflect.ownKeys` 才能覆盖。

## 追问与易错点

- **`JSON.parse(JSON.stringify(obj))` 有什么坑？** 会丢失 `undefined`、函数、`Symbol`；`Date` 变成字符串；`RegExp` 变成 `{}`；遇到循环引用直接抛错；`NaN` / `Infinity` 变成 `null`。
- **`structuredClone` 呢？** 浏览器原生深拷贝，支持循环引用和大多数内置类型，但不能拷贝函数、DOM 节点，也不会保留原型链上的方法。
- **浅拷贝有哪些方式？** `Object.assign`、扩展运算符 `{...obj}`、`Array.prototype.slice` / `concat`、`Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj))`。
- **深拷贝要不要拷贝原型？** 面试场景一般不需要（属性拷贝即够用）；若要完整保留可用 `Object.create(Object.getPrototypeOf(target))` 创建 `clone`。
- **递归会栈溢出吗？** 层级极深时会。可改成「循环 + 栈」的迭代写法规避，但代码复杂度高，面试中说明思路即可。

## 相关题目

- [handwriting-006-array-flat](/q/handwriting/handwriting-006-array-flat)

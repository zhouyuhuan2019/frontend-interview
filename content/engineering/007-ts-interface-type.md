---
title: TypeScript 中 interface 与 type 的区别是什么？
subtopic: TypeScript
difficulty: junior
frequency: high
tags: [TypeScript, interface, type, 声明合并]
order: 70
---

## 参考答案

两者在「描述对象结构」上大部分场景等价，核心区别有四点：

| 维度 | interface | type |
| --- | --- | --- |
| 能描述什么 | 仅对象/函数结构 | 任意类型：联合、元组、原始类型、映射类型 |
| 同名声明 | **自动合并**（声明合并） | 报错：重复标识符 |
| 扩展方式 | `extends` | 交叉类型 `&` |
| 类实现 | `implements` | 对象型别名也可以，联合类型不行 |

**使用建议**：描述对象形状、类的契约、需要被扩展/合并的公共 API 用 `interface`；联合类型、工具类型、函数签名别名、元组用 `type`。团队统一约定比纠结优劣更重要。

## 原理讲解

**1. type 的表达能力更强**，能表示 interface 完全无法表示的东西：

```ts
type Status = 'loading' | 'success' | 'error' // 联合类型
type Point = [number, number]                  // 元组
type ID = string | number                      // 原始类型组合
type Fn = (a: number) => string                // 函数别名
```

**2. 声明合并是 interface 的独门能力**。同名 interface 会自动合并成员，这在给第三方库/全局对象打类型补丁时不可替代：

```ts
interface User { name: string }
interface User { age: number }
// 等价于 { name: string; age: number }

// 给全局 Window 扩展属性
declare global {
  interface Window {
    __APP_VERSION__: string
  }
}
```

type 同名声明会直接编译报错。

**3. 扩展方式不同，冲突时的行为也不同**：

```ts
interface A { x: number }
interface B extends A { y: number } // interface 用 extends

type C = A & { y: number }          // type 用交叉类型
```

成员类型冲突时，`extends` 会直接报错（更安全）；`&` 可能把成员折叠成 `never`，静默埋雷。

**4. 类实现的差别**：

```ts
interface Flyable { fly(): void }
class Bird implements Flyable { fly() {} }

type Walkable = { walk(): void }
class Dog implements Walkable { walk() {} } // 对象型 type 也可以

type Union = Flyable | Walkable
class X implements Union {} // 报错：不能 implements 联合类型
```

**5. 性能细节**：大型项目中，interface 的 extends 关系能被编译器缓存为具名类型，增量检查更快；`&` 每次都要展开计算。这也是官方建议「优先用 interface 描述对象」的原因之一。

## 追问与易错点

- **什么时候必须用 type？** 联合类型、元组、函数别名、条件类型、映射类型（如 `Partial` 的实现）——这些 interface 语法上就不支持。
- **interface 能 extends 一个 type 吗？** 可以继承「对象型」的 type 别名；继承联合类型会报错。
- **为什么开源库导出的类型多用 interface？** 使用者可以通过声明合并扩展它（比如给 Express 的 Request 挂自定义字段），type 则封死了这条路。
- **implements 对象型 type 和 interface 有差别吗？** 运行时没有差别，但工程习惯上「可被 implements 的契约」用 interface 表达，意图更清晰。

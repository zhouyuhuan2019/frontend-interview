// =============================================================================
// 代码运行 Worker
// 在独立线程中执行纯 JS 片段：代理 console 捕获输出、回传返回值与错误。
// 不引入 WebWorker lib（会与 DOM lib 冲突），因此这里用最小化接口断言 self。
// =============================================================================

/** 最小化的 worker 全局接口 */
interface WorkerScope {
  postMessage(message: unknown): void
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void
  addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void
  addEventListener(type: 'unhandledrejection', listener: (event: PromiseRejectionEvent) => void): void
}

const scope = self as unknown as WorkerScope
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
) => (...args: unknown[]) => Promise<unknown>

// ---- 值序列化：结构化克隆不友好的类型统一转成可读字符串 ----
function formatValue(value: unknown, seen = new WeakSet<object>(), depth = 0): string {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'

  const type = typeof value
  if (type === 'string') return depth > 0 ? JSON.stringify(value) : (value as string)
  if (type === 'number' || type === 'boolean' || type === 'bigint') return String(value)
  if (type === 'symbol') return value.toString()
  if (type === 'function') return `ƒ ${(value as () => void).name || 'anonymous'}()`

  if (value instanceof Error) return `${value.name}: ${value.message}`
  if (value instanceof Map) return `Map(${value.size}) ${formatValue(Object.fromEntries(value), seen, depth + 1)}`
  if (value instanceof Set) return `Set(${value.size}) ${formatValue([...value], seen, depth + 1)}`
  if (value instanceof Promise) return 'Promise { <pending> }'
  if (seen.has(value as object)) return '[Circular]'
  if (depth >= 3) return Array.isArray(value) ? '[Array]' : '[Object]'

  seen.add(value as object)
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

let currentId = ''

function emit(payload: Record<string, unknown>): void {
  scope.postMessage({ id: currentId, ...payload })
}

// ---- console 代理：替换全局 console，保证代码里的全局写法也能被捕获 ----
const CONSOLE_METHODS = [
  'log',
  'info',
  'warn',
  'error',
  'debug',
  'trace',
  'table',
  'dir',
  'group',
  'groupEnd',
  'assert',
] as const

const proxyConsole = Object.fromEntries(
  CONSOLE_METHODS.map((method) => [
    method,
    (...args: unknown[]) => {
      emit({ type: 'log', level: method === 'debug' ? 'log' : method, text: args.map((arg) => formatValue(arg)).join(' ') })
    },
  ]),
) as unknown as Console

Object.assign(globalThis, {
  console: proxyConsole,
  // 收紧权限：题目只需要纯计算，不需要发起网络请求
  fetch: undefined,
})

scope.addEventListener('unhandledrejection', (event) => {
  emit({ type: 'error', name: 'UnhandledRejection', message: formatValue(event.reason) })
})

scope.addEventListener('error', (event) => {
  emit({ type: 'error', name: 'Error', message: event.message })
})

/**
 * 包装代码：
 * 优先按「表达式」执行（控制台式体验，可直接看到返回值），
 * 语法不通过再回退为「语句块」执行。
 */
function wrapCode(code: string): { fn: (...args: unknown[]) => Promise<unknown>; isExpression: boolean } {
  try {
    // 末尾换行用于规避行尾 // 注释带来的 ASI 问题
    return {
      fn: new AsyncFunction('console', `"use strict";\nreturn (\n${code}\n)`),
      isExpression: true,
    }
  } catch {
    return {
      fn: new AsyncFunction('console', `"use strict";\n${code}`),
      isExpression: false,
    }
  }
}

scope.addEventListener('message', async (event: MessageEvent) => {
  const data = event.data as { type?: string; id?: string; code?: string }
  if (data.type !== 'run') return

  currentId = data.id ?? ''
  const startedAt = Date.now()

  try {
    const { fn, isExpression } = wrapCode(data.code ?? '')
    const result = await fn(proxyConsole)

    if (result !== undefined) {
      emit({ type: 'result', text: formatValue(result) })
    } else if (isExpression) {
      emit({ type: 'result', text: 'undefined' })
    }
  } catch (error) {
    const runtimeError = error as Error
    emit({
      type: 'error',
      name: runtimeError?.name ?? 'Error',
      message: String(runtimeError?.message ?? runtimeError),
      stack: typeof runtimeError?.stack === 'string' ? runtimeError.stack.split('\n').slice(0, 6).join('\n') : '',
    })
  } finally {
    emit({ type: 'done', durationMs: Date.now() - startedAt })
  }
})

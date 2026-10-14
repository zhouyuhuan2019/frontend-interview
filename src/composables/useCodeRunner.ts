// =============================================================================
// 代码运行器（父层）
// 每次运行都新建一个 Worker：worker.terminate() 是唯一可靠的「硬中断」手段，
// 遇到死循环时能立即回收线程，父页面不会被卡住。
// =============================================================================

import { onScopeDispose, ref } from 'vue'
import { APP } from '@/config/app'

/** 运行时输出的一行 */
export interface RunLine {
  kind: 'log' | 'result' | 'error' | 'system'
  /** 日志级别（仅 kind === 'log' 时有意义） */
  level?: string
  text: string
  /** 错误堆栈等补充信息 */
  detail?: string
}

interface RunnerMessage {
  id: string
  type: 'log' | 'result' | 'error' | 'done'
  level?: string
  text?: string
  name?: string
  message?: string
  stack?: string
  durationMs?: number
}

export function useCodeRunner(options: { timeoutMs?: number } = {}) {
  const timeoutMs = options.timeoutMs ?? APP.runTimeoutMs
  const lines = ref<RunLine[]>([])
  const isRunning = ref(false)

  let worker: Worker | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let currentId = ''

  function push(line: RunLine): void {
    lines.value.push(line)
  }

  function clearTimer(): void {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  function teardown(): void {
    clearTimer()
    worker?.terminate()
    worker = null
  }

  function handleMessage(event: MessageEvent<RunnerMessage>): void {
    const message = event.data
    if (message.id !== currentId) return

    switch (message.type) {
      case 'log':
        push({ kind: 'log', level: message.level, text: message.text ?? '' })
        break
      case 'result':
        push({ kind: 'result', text: message.text ?? '' })
        break
      case 'error':
        push({
          kind: 'error',
          text: `${message.name ?? 'Error'}: ${message.message ?? ''}`,
          detail: message.stack,
        })
        break
      case 'done':
        push({ kind: 'system', text: `执行完成 · ${message.durationMs ?? 0}ms` })
        isRunning.value = false
        clearTimer()
        break
    }
  }

  function spawn(): void {
    teardown()
    worker = new Worker(new URL('../workers/runner.worker.ts', import.meta.url), { type: 'module' })
    worker.addEventListener('message', handleMessage)
    worker.addEventListener('error', (event) => {
      push({ kind: 'system', text: `运行时异常：${event.message}` })
      isRunning.value = false
      clearTimer()
    })
  }

  /** 运行一段 JS 代码 */
  function run(code: string): void {
    lines.value = []
    isRunning.value = true
    spawn()

    currentId = crypto.randomUUID()
    worker?.postMessage({ type: 'run', id: currentId, code })

    timer = setTimeout(() => {
      push({
        kind: 'error',
        text: `执行超时（> ${timeoutMs}ms）已强制终止：可能存在死循环或长时间等待。`,
      })
      teardown()
      isRunning.value = false
    }, timeoutMs)
  }

  function reset(): void {
    teardown()
    lines.value = []
    isRunning.value = false
  }

  onScopeDispose(reset)

  return { lines, isRunning, run, reset }
}

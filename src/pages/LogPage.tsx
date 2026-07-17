import { useState, useRef, useEffect } from 'react'
import { TrashIcon } from '@radix-ui/react-icons'

type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'system' | 'model' | 'gen'

interface LogEntry {
  id: number
  time: string
  level: LogLevel
  message: string
}

function now(): string {
  const d = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const ms = d.getMilliseconds().toString().padStart(3, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms}`
}

const LEVEL_CONFIG: Record<LogLevel, { label: string; cssClass: string }> = {
  info:    { label: 'INFO', cssClass: 'log-info' },
  success: { label: 'SUCCESS', cssClass: 'log-success' },
  warn:    { label: 'WARN', cssClass: 'log-warn' },
  error:   { label: 'ERROR', cssClass: 'log-error' },
  system:  { label: 'SYSTEM', cssClass: 'log-system' },
  model:   { label: 'MODEL', cssClass: 'log-model' },
  gen:     { label: 'GEN', cssClass: 'log-gen' },
}

let logId = 0

export default function LogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<LogLevel | 'all'>('all')
  const logRef = useRef<HTMLDivElement>(null)

  const addLog = (level: LogLevel, msg: string) => {
    setLogs(p => {
      const n = [...p, { id: ++logId, time: now(), level, message: msg }]
      return n.length > 500 ? n.slice(-500) : n
    })
  }

  // 演示：自动生成一些日志
  useEffect(() => {
    addLog('system', '愿光指纹浏览器 v0.1.0 启动')
    const t = setTimeout(() => addLog('info', '服务状态检查: 运行正常'), 500)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight)
  }, [logs])

  const filtered = filter === 'all' ? logs : logs.filter(l => l.level === filter)

  return (
    <div className="h-full flex flex-col">
      {/* 标题区 */}
      <div className="px-6 pt-5 pb-3 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">操作日志</h1>
        <p className="text-sm text-gray-400 mt-1">系统运行记录与事件追踪</p>
      </div>

      {/* 过滤栏 */}
      <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2">
        {(['all', 'system', 'info', 'success', 'warn', 'error', 'model', 'gen'] as const).map(l => (
          <button
            key={l}
            onClick={() => setFilter(l)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-75 ${
              filter === l
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {l === 'all' ? '全部' : LEVEL_CONFIG[l].label}
          </button>
        ))}
        <button
          onClick={() => setLogs([])}
          className="ml-auto px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-50 flex items-center gap-1"
        >
          <TrashIcon className="w-3.5 h-3.5" />
          清空
        </button>
      </div>

      {/* 日志列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">暂无日志</div>
        ) : (
          <div ref={logRef} className="space-y-0.5 font-mono text-xs leading-relaxed">
            {filtered.map(log => {
              const cfg = LEVEL_CONFIG[log.level]
              return (
                <div key={log.id} className="flex gap-4 py-1 px-3 rounded hover:bg-gray-50 items-start">
                  <span className="text-gray-400 w-44 flex-shrink-0">{log.time}</span>
                  <span className={`w-16 flex-shrink-0 font-semibold ${cfg.cssClass}`}>[{cfg.label}]</span>
                  <span className="text-gray-700 flex-1">{log.message}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

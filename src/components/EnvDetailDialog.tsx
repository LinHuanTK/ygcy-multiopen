import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Cross2Icon, PlayIcon, StopIcon, TrashIcon } from '@radix-ui/react-icons'
import type { BrowserEnv } from '../stores/rootStore'
type Environment = BrowserEnv

const PLATFORMS = [
  { value: 'bilibili', label: 'B站' },
  { value: 'douyin', label: '抖音' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'kuaishou', label: '快手' },
]

interface EnvDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  env: Environment | null
  proxies: { id: string; label: string; host: string }[]
  onSave: (env: Environment) => void
  onDelete: (id: string) => void
  onStart: (id: string) => void
  onStop: (id: string) => void
}

export default function EnvDetailDialog({ open, onOpenChange, env, proxies, onSave, onDelete, onStart, onStop }: EnvDetailDialogProps) {
  const [form, setForm] = useState<Environment | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (open && env) { setForm({ ...env }) }
    else if (!open) { setForm(null); setHasChanges(false); setConfirmDelete(false) }
  }, [open, env])

  if (!env) return null
  const f = form || env

  const set = (k: keyof Environment, v: string) => {
    setForm(p => { setHasChanges(true); return { ...(p || env), [k]: v } })
  }

  const handleSave = () => { if (f) onSave(f); setHasChanges(false); onOpenChange(false) }
  const handleDelete = () => { onDelete(env.id); onOpenChange(false) }
  const handleStart = () => { onStart(env.id); onOpenChange(false) }
  const handleStop = () => { onStop(env.id); onOpenChange(false) }
  const selectedProxy = proxies.find(p => p.id === f.proxy_id)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] bg-white rounded-xl shadow-xl z-50">
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
            <Dialog.Title className="text-base font-semibold text-gray-900">环境详情 - {f.name}</Dialog.Title>
            <Dialog.Close asChild>
              <button className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-75">
                <Cross2Icon className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="px-6 py-3 bg-gray-50 flex items-center gap-4 text-xs">
            <span className="text-gray-500">编号: <span className="font-mono text-gray-700">{env.id}</span></span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">状态: <span className={'ml-1 font-medium ' + (env.status === 'running' ? 'text-green-600' : env.status === 'error' ? 'text-red-600' : 'text-gray-500')}>
              {env.status === 'running' ? '运行中' : env.status === 'error' ? '异常' : '已停止'}
            </span></span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">出口 IP: <span className="text-gray-700">{env.exit_ip}</span></span>
          </div>

          <div className="px-6 py-5 space-y-4 max-h-[50vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <Field label="环境名称">
                <input value={f.name} onChange={e => set('name', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors" />
              </Field>
              <Field label="环境编号">
                <input value={env.id} disabled className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm text-gray-400 bg-gray-50 cursor-not-allowed" />
              </Field>
            </div>

            <Field label="目标平台">
              <select value={f.platform} onChange={e => set('platform', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors bg-white">
                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="账号">
                <input value={f.account} onChange={e => set('account', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors" />
              </Field>
              <Field label="密码">
                <input type="password" value={f.password || ''} onChange={e => set('password', e.target.value)} placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="浏览器内核">
                <select value={f.browser.startsWith('Chrome') ? 'chrome' : 'edge'} onChange={e => {
                  const ver = f.browser.match(/\d+/)?.[0] || '126'
                  set('browser', e.target.value === 'chrome' ? ('Chrome ' + ver) : ('Edge ' + ver))
                }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors bg-white">
                  <option value="chrome">Chrome</option>
                  <option value="edge">Edge</option>
                </select>
              </Field>
              <Field label="代理">
                <select value={f.proxy_id} onChange={e => {
                  set('proxy_id', e.target.value)
                  const p = proxies.find(x => x.id === e.target.value)
                  set('proxy', p ? ('HTTP - ' + p.host) : '无')
                }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors bg-white">
                  <option value="">不使用代理</option>
                  {proxies.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </Field>
            </div>

            <Field label="当前代理信息">
              <div className="px-3 py-2 border border-gray-100 rounded-lg text-sm text-gray-500 bg-gray-50">
                {selectedProxy ? (selectedProxy.label + ' - 出口 IP: ' + env.exit_ip) : '未使用代理'}
              </div>
            </Field>

            <Field label="扩展数量">
              <input value={f.extensions} onChange={e => set('extensions', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors" />
            </Field>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <button onClick={handleStart} disabled={env.status === 'running'}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors duration-75 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
                <PlayIcon className="w-3.5 h-3.5" /> 启动
              </button>
              <button onClick={handleStop} disabled={env.status !== 'running'}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-75 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
                <StopIcon className="w-3.5 h-3.5" /> 停止
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600 font-medium">确认删除？</span>
                  <button onClick={() => { setConfirmDelete(false); handleDelete() }}
                    className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors duration-75 active:scale-[0.98]">
                    确认
                  </button>
                  <button onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors duration-75">
                    取消
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors duration-75 active:scale-[0.98]">
                  <TrashIcon className="w-3.5 h-3.5" /> 删除
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => onOpenChange(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-75 active:scale-[0.98]">取消</button>
              <button onClick={handleSave} disabled={!hasChanges} className="px-5 py-2 text-sm font-medium text-white bg-[#2563eb] rounded-lg hover:bg-[#1d4ed8] transition-colors duration-75 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">保存修改</button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>{children}</div>
}

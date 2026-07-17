import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import { Cross2Icon, CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons'

const PLATFORMS = [
  { value: 'bilibili', label: 'B站' },
  { value: 'douyin', label: '抖音' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'kuaishou', label: '快手' },
]

const BROWSERS = [
  { value: 'chrome', label: 'Chrome' },
  { value: 'edge', label: 'Edge' },
]

interface Proxy {
  id: string
  label: string
  host: string
}

interface CreateEnvDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proxies: Proxy[]
  onSubmit: (data: EnvFormData) => void
}

export interface EnvFormData {
  platform: string
  account: string
  password: string
  browser: string
  proxyId: string
  name: string
  remark: string
}

const initForm = (): EnvFormData => ({
  platform: '',
  account: '',
  password: '',
  browser: 'chrome',
  proxyId: '',
  name: '',
  remark: '',
})

export default function CreateEnvDialog({ open, onOpenChange, proxies, onSubmit }: CreateEnvDialogProps) {
  const [form, setForm] = useState<EnvFormData>(initForm)
  const [errors, setErrors] = useState<Partial<Record<keyof EnvFormData, string>>>({})

  const set = (k: keyof EnvFormData, v: string) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => ({ ...p, [k]: undefined }))
  }

  const validate = (): boolean => {
    const errs: Partial<Record<keyof EnvFormData, string>> = {}
    if (!form.platform) errs.platform = '请选择目标平台'
    if (!form.account) errs.account = '请输入手机号'
    else if (!/^1[3-9]\d{9}$/.test(form.account)) errs.account = '手机号格式不正确（11位，1开头）'
    if (!form.password) errs.password = '请输入密码'
    if (!form.name) errs.name = '请输入环境名称'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSubmit(form)
    setForm(initForm())
    onOpenChange(false)
  }

  const handleCancel = () => {
    setForm(initForm())
    setErrors({})
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleCancel() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] bg-white rounded-xl shadow-xl z-50
                     data-[state=open]:animate-in data-[state=closed]:animate-out
                     data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0
                     data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
        >
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
            <Dialog.Title className="text-base font-semibold text-gray-900">新建浏览器环境</Dialog.Title>
            <Dialog.Close asChild>
              <button className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-75">
                <Cross2Icon className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* 表单 */}
          <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* 环境名称 */}
            <Field label="环境名称" error={errors.name}>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="例：B站矩阵-01"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400
                           focus:outline-none focus:border-blue-400 transition-colors"
              />
            </Field>

            {/* 目标平台 */}
            <Field label="目标平台" error={errors.platform}>
              <SelectSelect
                value={form.platform}
                onValueChange={v => set('platform', v)}
                placeholder="选择平台"
                items={PLATFORMS}
              />
            </Field>

            {/* 账号 / 密码 */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="账号" error={errors.account}>
                <input
                  value={form.account}
                  onChange={e => set('account', e.target.value)}
                  placeholder="手机号（11位）"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400
                             focus:outline-none focus:border-blue-400 transition-colors"
                />
              </Field>
              <Field label="密码" error={errors.password}>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="登录密码"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400
                             focus:outline-none focus:border-blue-400 transition-colors"
                />
              </Field>
            </div>

            {/* 浏览器内核 */}
            <Field label="浏览器内核">
              <SelectSelect
                value={form.browser}
                onValueChange={v => set('browser', v)}
                placeholder="选择浏览器"
                items={BROWSERS}
              />
            </Field>

            {/* 代理 */}
            <Field label="代理">
              <SelectSelect
                value={form.proxyId}
                onValueChange={v => set('proxyId', v)}
                placeholder="不使用代理"
                items={proxies.map(p => ({ value: p.id, label: p.label }))}
              />
            </Field>

            {/* 备注 */}
            <Field label="备注">
              <textarea
                value={form.remark}
                onChange={e => set('remark', e.target.value)}
                placeholder="可选备注信息"
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400
                           focus:outline-none focus:border-blue-400 transition-colors resize-none"
              />
            </Field>
          </div>

          {/* 底部按钮 */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg
                         hover:bg-gray-50 transition-colors duration-75 active:scale-[0.98]"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              className="px-5 py-2 text-sm font-medium text-white bg-[#2563eb] rounded-lg
                         hover:bg-[#1d4ed8] transition-colors duration-75 active:scale-[0.98]"
            >
              创建环境
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/* ---- 子组件 ---- */

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function SelectSelect({ value, onValueChange, placeholder, items }: {
  value: string
  onValueChange: (v: string) => void
  placeholder: string
  items: { value: string; label: string }[]
}) {
  return (
    <Select.Root value={value || undefined} onValueChange={onValueChange}>
      <Select.Trigger
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg text-sm
                   text-gray-700 data-[placeholder]:text-gray-400
                   focus:outline-none focus:border-blue-400 transition-colors"
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <ChevronDownIcon className="w-4 h-4 text-gray-400" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50"
          position="popper"
          sideOffset={4}
        >
          <Select.Viewport>
            {items.map(item => (
              <Select.Item
                key={item.value}
                value={item.value}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 cursor-pointer
                           data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700
                           data-[state=checked]:text-blue-700 outline-none"
              >
                <Select.ItemText>{item.label}</Select.ItemText>
                <Select.ItemIndicator className="ml-auto">
                  <CheckIcon className="w-3.5 h-3.5 text-blue-600" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

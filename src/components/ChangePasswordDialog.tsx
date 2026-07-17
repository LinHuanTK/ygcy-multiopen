import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'

interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  username: string
}

async function tauriInvoke<T>(cmd: string, args?: any): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  return args ? await invoke(cmd, args) : await invoke(cmd)
}

export default function ChangePasswordDialog({ open, onOpenChange, username }: ChangePasswordDialogProps) {
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = async () => {
    setError('')
    setSuccess(false)
    if (!oldPwd || !newPwd) { setError('请填写完整'); return }
    if (newPwd.length < 4) { setError('新密码至少 4 位'); return }
    if (newPwd !== confirmPwd) { setError('两次密码不一致'); return }

    setLoading(true)
    try {
      await tauriInvoke('change_password', { username, oldPassword: oldPwd, newPassword: newPwd })
      setSuccess(true)
      setOldPwd(''); setNewPwd(''); setConfirmPwd('')
      setTimeout(() => onOpenChange(false), 1500)
    } catch (e: any) {
      setError(e?.toString() || '修改失败')
    }
    setLoading(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-white rounded-xl shadow-xl z-50">
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
            <Dialog.Title className="text-base font-semibold text-gray-900">修改密码</Dialog.Title>
            <Dialog.Close asChild>
              <button className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-75">
                <Cross2Icon className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="px-6 py-5 space-y-4">
            <p className="text-xs text-gray-400">当前用户：{username}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">当前密码</label>
              <input type="password" value={oldPwd} onChange={e => { setOldPwd(e.target.value); setError('') }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">新密码</label>
              <input type="password" value={newPwd} onChange={e => { setNewPwd(e.target.value); setError('') }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">确认新密码</label>
              <input type="password" value={confirmPwd} onChange={e => { setConfirmPwd(e.target.value); setError('') }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 transition-colors" />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            {success && <p className="text-xs text-green-600">密码修改成功！</p>}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
            <button onClick={handleChange} disabled={loading}
              className="px-5 py-2 text-sm font-medium text-white bg-[#2563eb] rounded-lg hover:bg-[#1d4ed8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {loading ? '提交中...' : '修改密码'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

import { useState, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { Cross2Icon } from '@radix-ui/react-icons'

interface BulkEnvEntry {
  name: string
  platform: string
  account: string
  password: string
  proxyId: string
}

interface BulkImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (entries: BulkEnvEntry[]) => void
}

const PLATFORM_OPTIONS = ['B站', '抖音', '小红书', '快手']
const PLATFORM_MAP: Record<string, string> = {
  'B站': 'bilibili',
  '抖音': 'douyin',
  '小红书': 'xiaohongshu',
  '快手': 'kuaishou',
}

// CSV 解析
function parseCSV(text: string): BulkEnvEntry[] {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length === 0) return []

  const header = lines[0].toLowerCase()
  const hasHeader = header.includes('名称') || header.includes('name') || header.includes('平台') || header.includes('账号')

  const dataLines = hasHeader ? lines.slice(1) : lines
  const results: BulkEnvEntry[] = []

  for (const line of dataLines) {
    const cols = line.split(/[,\t]/).map(s => s.trim()).filter(Boolean)
    if (cols.length < 2) continue

    const name = cols[0]
    const platformInput = cols[1]
    const account = cols[2] || ''
    const password = cols[3] || ''

    // 自动匹配平台
    const matched = PLATFORM_OPTIONS.find(p => platformInput.includes(p))
    const platform = matched ? PLATFORM_MAP[matched] : 'bilibili'

    results.push({ name, platform, account, password, proxyId: '' })
  }

  return results
}

export default function BulkImportDialog({ open, onOpenChange, onSubmit }: BulkImportDialogProps) {
  const [tab, setTab] = useState('batch')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 手动批量输入
  const [batchText, setBatchText] = useState(`B站矩阵-01\tB站\texample1@163.com\tpwd123
B站矩阵-02\tB站\texample2@163.com\tpwd456
抖音矩阵-01\t抖音\tdouyin01@qq.com\tpwd789
小红书矩阵-01\t小红书\txhs01@gmail.com\tpwd012`)

  // CSV 导入状态
  const [csvFileName, setCsvFileName] = useState('')
  const [csvPreview, setCsvPreview] = useState<BulkEnvEntry[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCsvFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      setCsvPreview(parsed)
    }
    reader.readAsText(file)
  }

  const handleSubmit = () => {
    let entries: BulkEnvEntry[]

    if (tab === 'batch') {
      entries = parseCSV(batchText)
    } else {
      entries = csvPreview
    }

    if (entries.length === 0) return
    onSubmit(entries)
    setBatchText('')
    setCsvFileName('')
    setCsvPreview([])
    onOpenChange(false)
  }

  const handleCancel = () => {
    setBatchText('')
    setCsvFileName('')
    setCsvPreview([])
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleCancel() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] bg-white rounded-xl shadow-xl z-50"
        >
          {/* 标题 */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
            <Dialog.Title className="text-base font-semibold text-gray-900">批量新增环境</Dialog.Title>
            <Dialog.Close asChild>
              <button className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-75">
                <Cross2Icon className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <Tabs.Root value={tab} onValueChange={setTab}>
            {/* Tab 切换 */}
            <Tabs.List className="flex px-6 pt-1 border-b border-gray-100">
              <Tabs.Trigger
                value="batch"
                className="px-4 py-2.5 text-sm font-medium text-gray-500 data-[state=active]:text-blue-600
                           data-[state=active]:border-b-2 data-[state=active]:border-blue-600
                           hover:text-gray-700 transition-colors"
              >
                手动批量输入
              </Tabs.Trigger>
              <Tabs.Trigger
                value="csv"
                className="px-4 py-2.5 text-sm font-medium text-gray-500 data-[state=active]:text-blue-600
                           data-[state=active]:border-b-2 data-[state=active]:border-blue-600
                           hover:text-gray-700 transition-colors"
              >
                CSV 文件导入
              </Tabs.Trigger>
            </Tabs.List>

            <div className="px-6 py-4 max-h-[55vh] overflow-y-auto">
              {/* 手动批量 */}
              <Tabs.Content value="batch" className="space-y-3">
                <p className="text-xs text-gray-400">
                  每行一个环境，用 Tab 或逗号分隔：<span className="text-gray-500">名称、平台、账号、密码</span>
                </p>
                <textarea
                  value={batchText}
                  onChange={e => setBatchText(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 font-mono
                             focus:outline-none focus:border-blue-400 transition-colors resize-none"
                  spellCheck={false}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    识别到 <strong className="text-gray-600">{parseCSV(batchText).length}</strong> 个环境
                  </span>
                </div>
              </Tabs.Content>

              {/* CSV 文件导入 */}
              <Tabs.Content value="csv" className="space-y-4">
                <p className="text-xs text-gray-400">
                  上传 CSV 文件，格式：名称, 平台, 账号, 密码（支持逗号或 Tab 分隔）
                </p>

                <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-blue-300 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {csvFileName ? (
                    <div>
                      <p className="text-sm text-gray-700 font-medium">{csvFileName}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        识别到 {csvPreview.length} 个环境
                      </p>
                      <button
                        onClick={() => {
                          fileInputRef.current?.click()
                        }}
                        className="mt-3 text-xs text-blue-600 hover:text-blue-700"
                      >
                        重新选择文件
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                      >
                        选择 CSV 文件
                      </button>
                      <p className="text-xs text-gray-400 mt-2">或拖拽文件到此处</p>
                    </div>
                  )}
                </div>

                {/* 预览 */}
                {csvPreview.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">预览（前 5 条）</p>
                    <div className="border border-gray-100 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-gray-500 font-medium">名称</th>
                            <th className="px-3 py-2 text-gray-500 font-medium">平台</th>
                            <th className="px-3 py-2 text-gray-500 font-medium">账号</th>
                            <th className="px-3 py-2 text-gray-500 font-medium">密码</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {csvPreview.slice(0, 5).map((item, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 text-gray-700">{item.name}</td>
                              <td className="px-3 py-2 text-gray-500">{item.platform}</td>
                              <td className="px-3 py-2 text-gray-500">{item.account}</td>
                              <td className="px-3 py-2 text-gray-400">••••••</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Tabs.Content>
            </div>
          </Tabs.Root>

          {/* 底部 */}
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
              disabled={
                (tab === 'batch' && parseCSV(batchText).length === 0) ||
                (tab === 'csv' && csvPreview.length === 0)
              }
              className="px-5 py-2 text-sm font-medium text-white bg-[#2563eb] rounded-lg
                         hover:bg-[#1d4ed8] transition-colors duration-75 active:scale-[0.98]
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              批量导入
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

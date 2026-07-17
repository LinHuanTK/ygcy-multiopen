import { useEffect, useState } from 'react'
import * as Checkbox from '@radix-ui/react-checkbox'
import { CheckIcon, PlusIcon, MagnifyingGlassIcon, DownloadIcon, UploadIcon } from '@radix-ui/react-icons'
import CreateEnvDialog, { type EnvFormData } from '../components/CreateEnvDialog'
import EnvDetailDialog from '../components/EnvDetailDialog'
import BulkImportDialog from '../components/BulkImportDialog'
import DebugTestButton from '../components/DebugTestButton'
import useStore from '../stores/rootStore'
import type { BrowserEnv } from '../stores/rootStore'

const PLATFORM_LABELS: Record<string, string> = { bilibili: 'B站', douyin: '抖音', xiaohongshu: '小红书', kuaishou: '快手' }

export default function EnvironmentPage() {
  const store = useStore()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedEnv, setSelectedEnv] = useState<BrowserEnv | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)

  useEffect(() => { store.loadEnvironments(); store.loadProxies() }, [])

  const filtered = store.environments.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase())
  )
  const proxies = store.proxyItems()

  const handleCreate = async (data: EnvFormData) => {
    const proxy = proxies.find(p => p.id === data.proxyId)
    try {
      await store.createEnvironment({
        name: data.name, platform: data.platform, account: data.account,
        password: data.password, browser: `${data.browser === 'chrome' ? 'Chrome' : 'Edge'} 126`,
        proxy_id: data.proxyId, proxy: proxy ? `HTTP - ${proxy.host}` : '无',
      })
    } catch (e) {
      console.error('创建环境失败:', e)
      alert('创建环境失败，请确认 Tauri 后端已启动')
    }
  }

  const handleBulk = async (entries: { name: string; platform: string; account: string; password: string; proxyId: string }[]) => {
    for (const e of entries) {
      const proxy = proxies.find(p => p.id === e.proxyId)
      await store.createEnvironment({
        name: e.name, platform: e.platform, account: e.account,
        password: e.password, proxy_id: e.proxyId, proxy: proxy ? `HTTP - ${proxy.host}` : '无',
      })
    }
  }

  const handleExport = async () => {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeTextFile } = await import('@tauri-apps/plugin-fs')
      const path = await save({ filters: [{ name: 'JSON', extensions: ['json'] }], defaultPath: `ygcy-envs-backup-${new Date().toISOString().slice(0,10)}.json` })
      if (!path) return
      await writeTextFile(path, JSON.stringify(store.environments, null, 2))
    } catch {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([JSON.stringify(store.environments, null, 2)], { type: 'application/json' }))
      a.download = `ygcy-envs-backup-${new Date().toISOString().slice(0,10)}.json`
      a.click()
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-5 pb-3 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">环境管理</h1>
        <p className="text-sm text-gray-400 mt-1">真实 Chrome / Edge 独立用户目录</p>
      </div>
      <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-1.5 flex-wrap">
        <button onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563eb] text-white rounded-lg text-sm font-medium hover:bg-[#1d4ed8] transition-colors duration-75 active:scale-[0.98]">
          <PlusIcon className="w-4 h-4" /> 新建环境
        </button>
        <DebugTestButton />
        <button onClick={() => setBulkOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors duration-75 active:scale-[0.98]">
          <PlusIcon className="w-4 h-4" /> 批量新增
        </button>
        <button onClick={() => setBulkOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors duration-75 active:scale-[0.98]">
          <DownloadIcon className="w-4 h-4" /> 批量导入
        </button>
        <button onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors duration-75 active:scale-[0.98]">
          <UploadIcon className="w-4 h-4" /> 导出备份
        </button>
        <div className="ml-auto relative">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="环境搜索" value={search} onChange={e => setSearch(e.target.value)}
            className="w-48 pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-white border-b border-gray-100">
            <tr>
              <th className="table-header w-10"><Checkbox.Root checked={selected.size === store.environments.length} onCheckedChange={() => {
                if (selected.size === store.environments.length) setSelected(new Set()); else setSelected(new Set(store.environments.map(e => e.id)))
              }} className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center data-[state=checked]:bg-blue-600 flex-shrink-0 overflow-hidden">
                <Checkbox.Indicator><CheckIcon className="w-full h-full p-0.5 text-white" /></Checkbox.Indicator></Checkbox.Root></th>
              <th className="table-header">编号</th>
              <th className="table-header">名称</th>
              <th className="table-header">平台</th>
              <th className="table-header">账号</th>
              <th className="table-header">浏览器</th>
              <th className="table-header">代理</th>
              <th className="table-header">出口 IP</th>
              <th className="table-header">状态</th>
              <th className="table-header">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(env => (
              <tr key={env.id} className={`hover:bg-gray-50 transition-colors cursor-pointer ${selected.has(env.id) ? 'bg-blue-50/30' : ''}`}
                onClick={() => { setSelectedEnv(env); setDetailOpen(true) }}>
                <td className="table-cell"><Checkbox.Root checked={selected.has(env.id)} onCheckedChange={() => {
                  const n = new Set(selected); if (n.has(env.id)) n.delete(env.id); else n.add(env.id); setSelected(n)
                }} onClick={e => e.stopPropagation()} className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center data-[state=checked]:bg-blue-600 flex-shrink-0 overflow-hidden">
                  <Checkbox.Indicator><CheckIcon className="w-full h-full p-0.5 text-white" /></Checkbox.Indicator></Checkbox.Root></td>
                <td className="table-cell text-gray-400 text-xs font-mono">{env.id}</td>
                <td className="table-cell"><div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue-50 text-blue-700 text-xs font-bold flex-shrink-0">
                    {env.name.split(/[\s\-_]+/).map(w=>w[0]).join('').toUpperCase().slice(0,2)}</span>
                  <span className="text-sm text-gray-800">{env.name}</span></div></td>
                <td className="table-cell text-gray-600 text-xs">{PLATFORM_LABELS[env.platform] || env.platform}</td>
                <td className="table-cell text-gray-600 text-xs max-w-[120px] truncate" title={env.account}>{env.account}</td>
                <td className="table-cell text-gray-600 text-xs">{env.browser}</td>
                <td className="table-cell text-gray-600 text-xs max-w-[160px] truncate">{env.proxy}</td>
                <td className="table-cell text-gray-600 text-xs">{env.exit_ip}</td>
                <td className="table-cell">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${env.status === 'running' ? 'bg-green-50 text-green-700' : env.status === 'error' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${env.status === 'running' ? 'bg-green-500' : env.status === 'error' ? 'bg-red-500' : 'bg-gray-400'}`} />
                    {env.status === 'running' ? '运行中' : env.status === 'error' ? '异常' : '已停止'}</span></td>
                <td className="table-cell"><div className="flex items-center gap-1" onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>store.startBrowser(env.id)} className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors duration-75">启动</button>
                  <button className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors duration-75">同步</button>
                  <button className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors duration-75">更多</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="flex items-center justify-center py-16 text-gray-400 text-sm">{store.envLoading ? '加载中...' : '暂无环境数据'}</div>}
      </div>
      <CreateEnvDialog open={dialogOpen} onOpenChange={setDialogOpen} proxies={proxies} onSubmit={handleCreate} />
      <EnvDetailDialog open={detailOpen} onOpenChange={setDetailOpen} env={selectedEnv} proxies={proxies}
        onSave={store.updateEnvironment} onDelete={store.deleteEnvironment} onStart={store.startBrowser} onStop={store.stopBrowser} />
      <BulkImportDialog open={bulkOpen} onOpenChange={setBulkOpen} onSubmit={handleBulk} />
    </div>
  )
}

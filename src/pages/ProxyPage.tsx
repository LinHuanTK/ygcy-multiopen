import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { PlusIcon, MagnifyingGlassIcon, Cross2Icon, UpdateIcon } from '@radix-ui/react-icons'
import useStore from '../stores/rootStore'

async function tauriInvoke<T>(cmd: string, args?: any): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  return args ? await invoke(cmd, args) : await invoke(cmd)
}

export default function ProxyPage() {
  const store = useStore()
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [testResult, setTestResult] = useState<{ id: string; latency: number } | null>(null)
  const [form, setForm] = useState({ name: '', proxyType: 'HTTP', host: '', port: '8080', username: '', password: '', region: '', isp: '' })

  useEffect(() => { store.loadProxies() }, [])

  const filtered = store.proxies.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.host.includes(search) || p.region.includes(search)
  )

  const testLatency = async (proxy: typeof store.proxies[0]) => {
    const start = Date.now()
    try {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 5000)
      await fetch(`http://${proxy.host}:${proxy.port}`, { mode: 'no-cors', signal: controller.signal })
      const latency = Date.now() - start
      setTestResult({ id: proxy.id, latency })
    } catch {
      setTestResult({ id: proxy.id, latency: -1 })
    }
  }

  const handleAdd = async () => {
    const proxy = {
      id: '', name: form.name, proxy_type: form.proxyType, host: form.host,
      port: parseInt(form.port) || 0, username: form.username, password: form.password,
      region: form.region, isp: form.isp, status: 'online', latency: 0, used_count: 0, created_at: '',
    }
    try {
      await tauriInvoke('create_proxy', { proxy })
      await store.loadProxies()
      setAddOpen(false)
      setForm({ name: '', proxyType: 'HTTP', host: '', port: '8080', username: '', password: '', region: '', isp: '' })
    } catch (e) {
      console.error('添加失败', e)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-5 pb-3 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">代理管理</h1>
        <p className="text-sm text-gray-400 mt-1">住宅代理 IP 池管理，支持 HTTP/HTTPS/SOCKS5</p>
      </div>

      <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-1.5 flex-wrap">
        <button onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563eb] text-white rounded-lg text-sm font-medium hover:bg-[#1d4ed8] transition-colors duration-75 active:scale-[0.98]">
          <PlusIcon className="w-4 h-4" /> 添加代理
        </button>
        <div className="ml-auto relative">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="搜索代理" value={search} onChange={e => setSearch(e.target.value)}
            className="w-48 pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors" />
        </div>
      </div>

      <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-6 text-sm">
        <div><span className="text-gray-400">总计</span> <strong className="text-gray-700 ml-1">{store.proxies.length}</strong></div>
        <div><span className="text-green-500">●</span> <span className="text-gray-500">在线</span> <strong className="text-green-600 ml-1">{store.proxies.filter(p=>p.status==='online').length}</strong></div>
        <div><span className="text-gray-400">●</span> <span className="text-gray-500">离线</span> <strong className="text-gray-600 ml-1">{store.proxies.filter(p=>p.status==='offline').length}</strong></div>
        <div><span className="text-red-500">●</span> <span className="text-gray-500">异常</span> <strong className="text-red-600 ml-1">{store.proxies.filter(p=>p.status==='error').length}</strong></div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-white border-b border-gray-100">
            <tr>
              <th className="table-header">名称</th>
              <th className="table-header">类型</th>
              <th className="table-header">地址</th>
              <th className="table-header">地区/运营商</th>
              <th className="table-header">状态</th>
              <th className="table-header">延迟</th>
              <th className="table-header">使用</th>
              <th className="table-header">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(proxy => (
              <tr key={proxy.id} className="hover:bg-gray-50 transition-colors">
                <td className="table-cell"><span className="text-sm text-gray-800 font-medium">{proxy.name}</span></td>
                <td className="table-cell">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-mono font-medium ${proxy.proxy_type==='SOCKS5'?'bg-purple-50 text-purple-600':proxy.proxy_type==='HTTP'?'bg-blue-50 text-blue-600':'bg-teal-50 text-teal-600'}`}>{proxy.proxy_type}</span></td>
                <td className="table-cell text-xs font-mono text-gray-700">{proxy.host}:{proxy.port}</td>
                <td className="table-cell text-xs text-gray-600">{proxy.region} · {proxy.isp}</td>
                <td className="table-cell">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${proxy.status==='online'?'bg-green-50 text-green-700':proxy.status==='error'?'bg-red-50 text-red-600':'bg-gray-50 text-gray-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${proxy.status==='online'?'bg-green-500':proxy.status==='error'?'bg-red-500':'bg-gray-400'}`} />
                    {proxy.status==='online'?'在线':proxy.status==='error'?'异常':'离线'}</span></td>
                <td className="table-cell text-xs">
                  {testResult?.id === proxy.id ? (
                    testResult.latency >= 0 ? <span className="text-green-600">{testResult.latency}ms</span> : <span className="text-red-500">超时</span>
                  ) : proxy.latency > 0 ? <span className="text-gray-700">{proxy.latency}ms</span> : <span className="text-gray-300">—</span>}
                </td>
                <td className="table-cell text-xs text-gray-500">{proxy.used_count}</td>
                <td className="table-cell">
                  <div className="flex items-center gap-1">
                    <button onClick={() => testLatency(proxy)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors duration-75">
                      <UpdateIcon className="w-3 h-3" /> 检测
                    </button>
                    <button onClick={() => store.deleteProxy(proxy.id)}
                      className="px-2 py-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors duration-75">删除</button>
                  </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {store.proxies.length === 0 && <div className="flex items-center justify-center py-16 text-gray-400 text-sm">暂无代理数据</div>}
      </div>

      {/* 添加代理弹窗 */}
      <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] bg-white rounded-xl shadow-xl z-50">
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
              <Dialog.Title className="text-base font-semibold text-gray-900">添加代理</Dialog.Title>
              <Dialog.Close asChild>
                <button className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-75">
                  <Cross2Icon className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">名称</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="例：北京联通-01" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">类型</label>
                  <select value={form.proxyType} onChange={e => setForm(p => ({ ...p, proxyType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors bg-white">
                    <option value="HTTP">HTTP</option>
                    <option value="HTTPS">HTTPS</option>
                    <option value="SOCKS5">SOCKS5</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">主机</label>
                  <input value={form.host} onChange={e => setForm(p => ({ ...p, host: e.target.value }))}
                    placeholder="127.0.0.1" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">端口</label>
                  <input value={form.port} onChange={e => setForm(p => ({ ...p, port: e.target.value }))}
                    placeholder="8080" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">用户名（可选）</label>
                  <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">密码（可选）</label>
                  <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">地区</label>
                  <input value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
                    placeholder="北京" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">运营商</label>
                  <input value={form.isp} onChange={e => setForm(p => ({ ...p, isp: e.target.value }))}
                    placeholder="中国联通" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setAddOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-75 active:scale-[0.98]">取消</button>
              <button onClick={handleAdd}
                disabled={!form.host || !form.name}
                className="px-5 py-2 text-sm font-medium text-white bg-[#2563eb] rounded-lg hover:bg-[#1d4ed8] transition-colors duration-75 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">添加</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

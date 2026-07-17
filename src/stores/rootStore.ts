import { create } from 'zustand'

// ========== 类型 ==========

export interface BrowserEnv {
  id: string; name: string; platform: string; account: string
  password?: string; browser: string; proxy_id: string; proxy: string
  exit_ip: string; country: string; extensions: string; status: string
  created_at: string; updated_at: string
}

export interface ProxyEntry {
  id: string; name: string; proxy_type: string; host: string; port: number
  username: string; password: string; region: string; isp: string
  status: string; latency: number; used_count: number; created_at: string
}

export interface StatRecord {
  envId: string; envName: string; platform: string
  runningSeconds: number; httpRequests: number; date: string
}

// ========== 工具函数 ==========

function genMockStats(): StatRecord[] {
  const r: StatRecord[] = []
  const names = ['B站矩阵','抖音矩阵','小红书矩阵','快手矩阵','跨境电商']
  const plats = ['bilibili','douyin','xiaohongshu','kuaishou','kuaishou']
  const today = new Date()
  for (let d = 29; d >= 0; d--) {
    const dt = new Date(today); dt.setDate(dt.getDate() - d)
    const ds = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
    names.forEach((n, i) => r.push({
      envId: `ENV-00${i+1}`, envName: n, platform: plats[i],
      runningSeconds: Math.floor(Math.random()*86400),
      httpRequests: Math.floor(Math.random()*500), date: ds,
    }))
  }
  return r
}

async function tauriInvoke<T>(cmd: string, args?: any): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  return args ? await invoke(cmd, args) : await invoke(cmd)
}

// ========== 纯函数：统计数据聚合 ==========

export function computeStatsByDate(stats: StatRecord[]) {
  const map = new Map<string, { running: number; requests: number }>()
  for (const s of stats) {
    const cur = map.get(s.date) || { running: 0, requests: 0 }
    cur.running += s.runningSeconds; cur.requests += s.httpRequests
    map.set(s.date, cur)
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, val]) => ({ date, running: val.running, requests: val.requests }))
}

export function computeStatsByEnv(stats: StatRecord[], envs: BrowserEnv[]) {
  const map = new Map<string, { running: number; requests: number }>()
  for (const s of stats) {
    const cur = map.get(s.envId) || { running: 0, requests: 0 }
    cur.running += s.runningSeconds; cur.requests += s.httpRequests
    map.set(s.envId, cur)
  }
  return Array.from(map.entries()).map(([envId, val]) => ({
    envId,
    envName: envs.find(e => e.id === envId)?.name || envId,
    running: val.running, requests: val.requests,
  }))
}

export function computeTotalHours(stats: StatRecord[]) {
  return Math.round(stats.reduce((s, r) => s + r.runningSeconds, 0) / 3600 * 10) / 10
}

export function computeTotalRequests(stats: StatRecord[]) {
  return stats.reduce((s, r) => s + r.httpRequests, 0)
}

// ========== Store ==========

interface AppStore {
  environments: BrowserEnv[]
  envLoading: boolean
  proxies: ProxyEntry[]
  proxyLoading: boolean
  stats: StatRecord[]
  statLoading: boolean

  loadEnvironments: () => Promise<void>
  createEnvironment: (env: Partial<BrowserEnv>) => Promise<void>
  updateEnvironment: (env: BrowserEnv) => Promise<void>
  deleteEnvironment: (id: string) => Promise<void>
  startBrowser: (envId: string) => Promise<void>
  stopBrowser: (envId: string) => Promise<void>

  loadProxies: () => Promise<void>
  deleteProxy: (id: string) => Promise<void>

  loadStats: () => Promise<void>

  proxyItems: () => { id: string; label: string; host: string }[]
}

const useStore = create<AppStore>((set, get) => ({
  environments: [],
  envLoading: false,
  proxies: [],
  proxyLoading: false,
  stats: genMockStats(),
  statLoading: false,

  proxyItems: () => get().proxies.map(p => ({
    id: p.id, label: `${p.name} (${p.host}:${p.port})`, host: `${p.host}:${p.port}`,
  })),

  async loadEnvironments() {
    set({ envLoading: true })
    try { set({ environments: await tauriInvoke<BrowserEnv[]>('list_environments') }) } catch (e) { console.error('[Store] loadEnvironments failed:', e) }
    set({ envLoading: false })
  },

  async createEnvironment(env) {
    console.log('[Store] createEnvironment called', env.name)
    await tauriInvoke('create_environment', {
      env: { id: 'tmp', name: env.name||'', platform: env.platform||'bilibili', account: env.account||'',
        password: env.password||'', browser: env.browser||'Chrome 126',
        proxy_id: env.proxy_id||'', proxy: env.proxy||'无',
        exit_ip: '', country: '中国', extensions: '0', status: 'stopped', created_at: '', updated_at: '' },
    })
    console.log('[Store] create_environment succeeded, reloading...')
    await get().loadEnvironments()
    console.log('[Store] reload completed, environments count:', get().environments.length)
  },

  async updateEnvironment(env: BrowserEnv) { await tauriInvoke('update_environment', { env }); await get().loadEnvironments() },
  async deleteEnvironment(id: string) { await tauriInvoke('delete_environment', { id }); await get().loadEnvironments() },
  async startBrowser(envId: string) { await tauriInvoke('start_browser', { envId }); await get().loadEnvironments() },
  async stopBrowser(envId: string) { await tauriInvoke('stop_browser', { envId }); await get().loadEnvironments() },

  async loadProxies() {
    set({ proxyLoading: true })
    try { set({ proxies: await tauriInvoke<ProxyEntry[]>('list_proxies') }) } catch {}
    set({ proxyLoading: false })
  },

  async deleteProxy(id) { await tauriInvoke('delete_proxy', { id }); await get().loadProxies() },

  async loadStats() {
    set({ statLoading: true })
    await new Promise(r => setTimeout(r, 300))
    set({ stats: genMockStats(), statLoading: false })
  },
}))

export default useStore

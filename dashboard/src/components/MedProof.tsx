'use client'

import { useEffect, useState, type ReactNode } from 'react'
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  Database,
  FileCheck2,
  FileSearch,
  FileText,
  Fingerprint,
  FolderOpen,
  Globe2,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  Network,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'

type Doc = {
  id: string | number
  caseId: string
  category: string
  status: string
  hash: string
  createdAt: string
  cordaTx?: string
  hederaSequence?: string
  hederaHash?: string
}
const navigation = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Documents', icon: FolderOpen },
  { name: 'Upload & register', icon: Upload },
  { name: 'Verify PDF', icon: ShieldCheck },
  { name: 'Synchronization', icon: RefreshCw },
  { name: 'Network overview', icon: Network },
]
const steps = [
  { name: 'Upload PDF', sub: 'Secure document intake', icon: Upload },
  { name: 'Generate hash', sub: 'SHA-256 fingerprint', icon: Fingerprint },
  { name: 'Store off-chain', sub: 'Private file storage', icon: Database },
  { name: 'Register on Corda', sub: 'Permissioned record', icon: Network },
  { name: 'Publish proof', sub: 'Hedera consensus', icon: Globe2 },
  { name: 'Verify PDF', sub: 'Independent validation', icon: ShieldCheck },
]
const tones: Record<string, string> = {
  VALID: 'bg-emerald-50 text-emerald-700',
  MODIFIED: 'bg-amber-50 text-amber-700',
  INCONSISTENT: 'bg-rose-50 text-rose-700',
  PENDING: 'bg-slate-100 text-slate-500',
  MISSING: 'bg-slate-100 text-slate-500',
}
function Badge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold tracking-wide ${tones[status] || tones.PENDING}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}
function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-xl border border-slate-200/90 bg-white shadow-[0_2px_3px_#182e3e02] ${className}`}
    >
      {children}
    </section>
  )
}
function MiniChart({ gray = false }: { gray?: boolean }) {
  return (
    <svg viewBox="0 0 100 35" className={`h-10 w-24 ${gray ? 'text-slate-400' : 'text-teal-500'}`}>
      <path
        d="M0 30L8 25 15 27 23 16 30 20 38 17 45 21 53 11 61 15 69 7 76 10 85 4 92 8 100 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M0 30L8 25 15 27 23 16 30 20 38 17 45 21 53 11 61 15 69 7 76 10 85 4 92 8 100 2V35H0Z"
        fill="currentColor"
        opacity=".07"
      />
    </svg>
  )
}
export default function MedProof() {
  const [page, setPage] = useState('Dashboard')
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All statuses')
  const [selected, setSelected] = useState<Doc | null>(null)
  const [mobile, setMobile] = useState(false)
  const [notice, setNotice] = useState('')
  const [period, setPeriod] = useState('Last 7 days')
  const [file, setFile] = useState<File | null>(null)
  const [caseId, setCaseId] = useState('')
  const [category, setCategory] = useState('Lab report')
  const [busy, setBusy] = useState(false)
  const [hash, setHash] = useState('')
  const [result, setResult] = useState('')
  const [receipt, setReceipt] = useState(false)
  const [alerts, setAlerts] = useState(true)
  const [health, setHealth] = useState<{
    status?: string
    mocks: boolean
    corda: { configured: boolean; mode: string }
    hedera: { configured: boolean; mode: string }
    storage: { configured: boolean }
  } | null>(null)
  const [statistics, setStatistics] = useState<{
    total_documents: number
    verification_statuses: Record<string, number>
    sync?: { pending: number; rejected: number; published: number; total: number }
    verification_history?: Array<{
      status: string
      created_at: string
    }>
  } | null>(null)
  const [syncStatus, setSyncStatus] = useState<{
    stats: { pending: number; rejected: number; published: number; total: number }
    queue: Array<Record<string, unknown>>
  } | null>(null)
  useEffect(() => {
    fetch('/api/documents')
      .then((r) => {
        if (!r.ok) throw Error()
        return r.json()
      })
      .then((data) => setDocs(Array.isArray(data) ? data : []))
      .catch(() => setError('Records could not be loaded. Please refresh to retry.'))
      .finally(() => setLoading(false))
    const navigate = () => {
      const p = decodeURIComponent(location.hash.slice(1))
      if ([...navigation.map((n) => n.name), 'Settings'].includes(p)) setPage(p)
    }
    navigate()
    window.addEventListener('hashchange', navigate)
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setHealth(data))
      .catch(() => setHealth(null))
    fetch('/api/dashboard/statistics')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setStatistics(data))
      .catch(() => setStatistics(null))
    fetch('/api/sync/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setSyncStatus(data))
      .catch(() => setSyncStatus(null))
    return () => window.removeEventListener('hashchange', navigate)
  }, [])
  useEffect(() => {
    const refresh = async () => {
      await Promise.all([
        fetch('/api/documents', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => setDocs(Array.isArray(data) ? data : []))
          .catch(() => undefined),
        fetch('/api/dashboard/statistics')
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => setStatistics(data))
          .catch(() => undefined),
        fetch('/api/sync/status')
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => setSyncStatus(data))
          .catch(() => undefined),
      ])
    }
    const interval = window.setInterval(refresh, 30000)
    return () => window.clearInterval(interval)
  }, [])
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(''), 4000)
      return () => clearTimeout(t)
    }
  }, [notice])
  const go = (p: string) => {
    setPage(p)
    window.location.hash = p
    setSelected(null)
    setMobile(false)
    setResult('')
    setReceipt(false)
    setFile(null)
    setHash('')
  }
  const valid = docs.filter((d) => d.status === 'VALID').length
  const modified = docs.filter((d) => d.status === 'MODIFIED').length
  const inconsistent = docs.filter((d) => d.status === 'INCONSISTENT').length
  const chartHistory = statistics?.verification_history ?? []
  const chartDays = period === 'Last 7 days' ? 7 : 30
  const chartBuckets = Array.from({ length: chartDays }, (_, index) => {
    const date = new Date()
    date.setUTCHours(0, 0, 0, 0)
    date.setUTCDate(date.getUTCDate() - (chartDays - 1 - index))
    const key = date.toISOString().slice(0, 10)
    const entries = chartHistory.filter(
      (item) => String(item.created_at).slice(0, 10) === key,
    )
    return {
      key,
      valid: entries.filter((item) => item.status === 'VALID').length,
      modified: entries.filter((item) => item.status === 'MODIFIED').length,
      inconsistent: entries.filter((item) => item.status === 'INCONSISTENT').length,
    }
  })
  const refreshLiveData = async () => {
    const [documentsResponse, statisticsResponse, syncResponse, healthResponse] =
      await Promise.all([
        fetch('/api/documents', { cache: 'no-store' }),
        fetch('/api/dashboard/statistics', { cache: 'no-store' }),
        fetch('/api/sync/status', { cache: 'no-store' }),
        fetch('/api/health', { cache: 'no-store' }),
      ])
    if (documentsResponse.ok) {
      const documentsData = await documentsResponse.json()
      setDocs(Array.isArray(documentsData) ? documentsData : [])
    }
    if (statisticsResponse.ok) setStatistics(await statisticsResponse.json())
    if (syncResponse.ok) setSyncStatus(await syncResponse.json())
    if (healthResponse.ok) setHealth(await healthResponse.json())
  }
  const filtered = docs.filter(
    (d) =>
      `${d.caseId} ${d.hash} ${d.category}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === 'All statuses' || d.status === filter),
  )
  const button =
    'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50'
  const primary =
    'inline-flex items-center justify-center gap-2 rounded-lg bg-[#138b87] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50'
  async function processFile() {
    if (!file) return
    setBusy(true)
    setResult('')
    setError('')
    try {
      if (page === 'Verify PDF') {
        if (!caseId) throw Error('Enter the pseudonymized case ID for this document.')
        const form = new FormData()
        form.set('file', file)
        form.set('caseId', caseId)
        const r = await fetch('/api/documents/verify', { method: 'POST', body: form })
        const data = await r.json()
        if (!r.ok) throw Error(data.error || data.detail || 'Verification failed.')
        setHash(data.recomputed_hash || '')
        setResult(data.status)
        setNotice(`Verification result: ${data.status}`)
      } else {
        const form = new FormData()
        form.set('file', file)
        form.set('category', category)
        const r = await fetch('/api/documents', { method: 'POST', body: form })
        const data = await r.json()
        if (!r.ok) throw Error(data.error)
        setCaseId(data.case_id)
        setHash(data.document_hash)
        setReceipt(true)
        setNotice(`PDF registered as ${data.case_id}`)
        const refresh = await fetch('/api/documents', { cache: 'no-store' })
        if (refresh.ok) {
          const current = await refresh.json()
          if (Array.isArray(current)) setDocs(current)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }
  function exportDocs() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(
      new Blob(
        [
          [
            'Case ID,Category,Status,SHA-256,Timestamp',
            ...filtered.map(
              (d) => `${d.caseId},${d.category},${d.status},${d.hash},${d.createdAt}`,
            ),
          ].join('\n'),
        ],
        { type: 'text/csv' },
      ),
    )
    a.download = 'medproof-records.csv'
    a.click()
    URL.revokeObjectURL(a.href)
    setNotice('Document report exported')
  }
  const table = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div className="flex items-center gap-2.5">
          <h2 className="font-semibold">
            {page === 'Dashboard' ? 'Recent documents' : 'All documents'}
          </h2>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
            {docs.length} documents
          </span>
        </div>
        {page === 'Dashboard' ? (
          <button
            onClick={() => go('Documents')}
            className="flex items-center gap-2 text-xs font-medium text-teal-700"
          >
            View all documents <ArrowRight size={14} />
          </button>
        ) : (
          <button onClick={exportDocs} className={button}>
            <ArrowDownToLine size={14} />
            Export
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-3 p-4">
        <label className="flex min-w-52 flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 text-slate-400">
          <Search size={15} />
          <input
            aria-label="Search documents"
            className="w-full bg-transparent py-2 text-xs outline-none text-slate-700"
            placeholder="Search by case ID or document hash..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter status"
          className={button}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {['All statuses', 'VALID', 'MODIFIED', 'INCONSISTENT', 'PENDING', 'MISSING'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap text-left text-xs">
          <thead className="border-y border-slate-100 bg-slate-50/70 text-[10px] font-medium text-slate-500">
            <tr>
              {['Document / Case ID', 'SHA-256 hash', 'Registered', 'Status', ''].map((s, i) => (
                <th className="px-5 py-3 font-medium" key={i}>
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(page === 'Dashboard' ? filtered.slice(0, 5) : filtered).map((d) => (
              <tr
                key={d.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
              >
                <td className="px-5 py-3.5">
                  <button
                    onClick={() => setSelected(d)}
                    className="flex items-center gap-3 text-left"
                  >
                    <span className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-500">
                      <FileText size={17} />
                    </span>
                    <span>
                      <span className="block font-semibold text-slate-700">{d.caseId}</span>
                      <span className="mt-1 block text-[10px] text-slate-400">
                        {d.category} <span className="mx-1">·</span> PDF
                      </span>
                    </span>
                  </button>
                </td>
                <td className="px-5 font-mono text-[11px] text-slate-500">
                  {d.hash?.slice(0, 10)}…{d.hash?.slice(-6)}{' '}
                  <button
                    aria-label="Copy hash"
                    className="ml-2 inline-block align-middle"
                    onClick={() => {
                      navigator.clipboard.writeText(d.hash)
                      setNotice('SHA-256 hash copied')
                    }}
                  >
                    <Copy size={12} />
                  </button>
                </td>
                <td className="px-5 text-[11px] text-slate-500">
                  {new Date(d.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric',
                  })}
                  <span className="mt-1 block text-[10px] text-slate-400">
                    {new Date(d.createdAt).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'UTC',
                    })}{' '}
                    UTC
                  </span>
                </td>
                <td className="px-5">
                  <Badge status={d.status} />
                </td>
                <td className="pr-4">
                  <button
                    aria-label="Document details"
                    onClick={() => setSelected(d)}
                    className="rounded p-1 hover:bg-slate-100"
                  >
                    <ChevronRight size={15} className="text-slate-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <div className="flex justify-center gap-2 p-10 text-slate-400">
            <LoaderCircle className="animate-spin" size={18} />
            Loading records…
          </div>
        )}
        {!loading && !filtered.length && (
          <div className="p-12 text-center">
            <FolderOpen className="mx-auto mb-3 text-slate-300" />
            <h3 className="font-medium">No documents found</h3>
            <p className="mt-1 text-xs text-slate-400">
              Try another search or register your first PDF.
            </p>
          </div>
        )}
      </div>
      <div className="flex justify-between border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400">
        <span>
          Showing {Math.min(filtered.length, page === 'Dashboard' ? 5 : 100)} of {filtered.length}{' '}
          documents
        </span>
        <span className="flex items-center gap-1.5">
          <LockKeyhole size={11} />
          Pseudonymized records only
        </span>
      </div>
    </>
  )
  return (
    <div className="min-h-screen bg-[#f6f8fa] text-[13px] text-[#253747]">
      {mobile && (
        <div className="fixed inset-0 z-30 bg-slate-950/30" onClick={() => setMobile(false)} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[228px] flex-col border-r border-[#e6ecee] bg-[#fbfdfd] transition-transform lg:translate-x-0 ${mobile ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <a
          href="#Dashboard"
          onClick={() => go('Dashboard')}
          className="flex h-[82px] items-center gap-2.5 px-7"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#128c87] text-white">
            <ShieldCheck size={24} strokeWidth={1.8} />
          </span>
          <span className="text-[23px] font-bold tracking-[-1px] text-[#163d42]">
            MedProof<span className="text-teal-500">.</span>
          </span>
        </a>
        <div className="px-4">
          <div className="mb-7 mt-1 flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5">
            <span className="rounded-md bg-slate-100 p-1.5">
              <Plus size={17} className="text-slate-600" />
            </span>
            <div className="flex-1">
              <p className="text-[11px] font-semibold">Medical workspace</p>
              <p className="mt-0.5 text-[10px] text-slate-400">Verification platform</p>
            </div>
            <ChevronDown size={13} className="text-slate-400" />
          </div>
          <p className="mb-3 px-3 text-[9px] font-semibold tracking-[1.6px] text-slate-400">
            WORKSPACE
          </p>
          <nav className="space-y-1">
            {navigation.map((n) => (
              <a
                key={n.name}
                href={`#${n.name}`}
                onClick={() => go(n.name)}
                className={`flex items-center gap-3 rounded-lg px-3 py-[11px] text-xs transition ${page === n.name ? 'bg-[#e5f3f1] font-semibold text-[#14817e]' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <n.icon size={17} strokeWidth={1.7} />
                {n.name}
                {n.name === 'Documents' && (
                  <span className="ml-auto rounded bg-white/80 px-1.5 py-0.5 text-[9px] text-slate-500">
                    {docs.length}
                  </span>
                )}
              </a>
            ))}
          </nav>
          <div className="my-5 border-t border-slate-200/70" />
          <p className="mb-3 px-3 text-[9px] font-semibold tracking-[1.6px] text-slate-400">
            PREFERENCES
          </p>
          <button
            onClick={() => go('Settings')}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-xs ${page === 'Settings' ? 'bg-teal-50 text-teal-700' : 'text-slate-500'}`}
          >
            <Settings2 size={17} />
            Settings
          </button>
          <button
            onClick={() =>
              setNotice(
                'MedProof: upload a PDF, store its fingerprint, then independently verify its proof. Network connections must be configured before live verification.',
              )
            }
            className="flex items-center gap-3 px-3 py-3 text-xs text-slate-500"
          >
            <CircleHelp size={17} />
            Help & documentation
            <ArrowUpRight size={12} />
          </button>
        </div>
        <div className="mt-auto p-4">
          <div className="rounded-xl border border-[#dcebe7] bg-[#f0f7f5] p-3.5">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-teal-800">
              <ShieldCheck size={16} />
              Privacy by design
            </div>
            <p className="mt-2 text-[10px] leading-[1.8] text-slate-500">
              Medical files stay off-chain.
              <br />
              Only cryptographic proofs are shared.
            </p>
            <div className="mt-3 flex gap-1.5">
              <span className="rounded border border-teal-800/10 bg-white px-1.5 py-0.5 text-[8px] text-teal-800">
                SHA-256
              </span>
              <span className="rounded border border-teal-800/10 bg-white px-1.5 py-0.5 text-[8px] text-teal-800">
                OFF-CHAIN STORAGE
              </span>
            </div>
          </div>
          <p className="mt-5 px-1 text-[9px] text-slate-400">
            MedProof v1.0 <span className="float-right">Testnet environment</span>
          </p>
        </div>
      </aside>
      <div className="lg:ml-[228px]">
        <header className="flex h-[72px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span className="text-xs text-slate-400">Workspace</span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="text-xs font-medium">{page}</span>
          </div>
          <div className="flex items-center gap-5">
            <span className="hidden items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-medium text-amber-700 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Testnet
            </span>
            <button
              aria-label="Notifications"
              onClick={() =>
                setNotice('You’re all caught up. Live network connections are not configured.')
              }
              className="relative text-slate-500"
            >
              <Bell size={18} />
              <span className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full border border-white bg-teal-500" />
            </button>
            <div className="h-6 border-l border-slate-200" />
            <button onClick={() => go('Settings')} className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e4eeec] text-[10px] font-semibold text-teal-800">
                MP
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-[11px] font-semibold">MedProof workspace</span>
                <span className="text-[9px] text-slate-400">
                  {health
                    ? health.mocks
                      ? 'Mock environment'
                      : 'Testnet environment'
                    : 'Checking environment'}
                </span>
              </span>
              <ChevronDown size={12} className="text-slate-400" />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-5 lg:px-8 lg:py-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-[25px] font-semibold tracking-[-.7px]">
                  {page === 'Dashboard' ? 'Dashboard overview' : page}
                </h1>
                <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[9px] text-slate-400">
                  LIVE SYSTEM
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {page === 'Dashboard'
                  ? 'A clear view of your documents, verification activity, and network health.'
                  : 'Secure records. Verifiable integrity. No patient identities.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button className={button} onClick={() => go('Verify PDF')}>
                <ShieldCheck size={15} />
                Verify PDF
              </button>
              <button className={primary} onClick={() => go('Upload & register')}>
                <Plus size={16} />
                Register document
              </button>
            </div>
          </div>
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"
            >
              {error}
              <button className="float-right" onClick={() => setError('')}>
                <X size={14} />
              </button>
            </div>
          )}
          {page === 'Dashboard' && (
            <>
              <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    title: 'Total documents',
                    count: statistics?.total_documents ?? docs.length,
                    icon: FileText,
                    sub: 'Registered in this workspace',
                    color: 'bg-blue-50 text-blue-500',
                  },
                  {
                    title: 'Verified documents',
                    count: statistics?.verification_statuses?.VALID ?? valid,
                    icon: ShieldCheck,
                    sub: 'Integrity successfully confirmed',
                    color: 'bg-emerald-50 text-emerald-600',
                  },
                  {
                    title: 'Pending registration',
                    count: statistics?.sync?.pending ?? docs.filter((d) => d.status === 'PENDING').length,
                    icon: Clock3,
                    sub: 'Awaiting network confirmation',
                    color: 'bg-amber-50 text-amber-600',
                  },
                  {
                    title: 'Flagged documents',
                    count:
                      (statistics?.verification_statuses?.MODIFIED ?? modified) +
                      (statistics?.verification_statuses?.INCONSISTENT ?? inconsistent),
                    icon: FileSearch,
                    sub: 'Require your attention',
                    color: 'bg-rose-50 text-rose-500',
                  },
                ].map((s, i) => (
                  <Card key={s.title} className="p-[18px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">{s.title}</span>
                      <span className={`rounded-lg p-2 ${s.color}`}>
                        <s.icon size={16} />
                      </span>
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <strong className="text-[31px] font-semibold leading-none tracking-[-1px]">
                        {loading ? '—' : s.count.toLocaleString()}
                      </strong>
                      <MiniChart gray={i > 1} />
                    </div>
                    <p className="mt-4 text-[9px] text-slate-400">
                      <span className={i < 2 ? 'mr-1 text-teal-600' : 'mr-1 text-slate-500'}>
                        {i < 2 ? '↗' : '·'}
                      </span>
                      {s.sub}
                    </p>
                  </Card>
                ))}
              </div>
              <div className="mb-5 grid gap-5 xl:grid-cols-[1.85fr_1fr]">
                <Card className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-semibold">Verification activity</h2>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Document integrity checks over time{' '}
                        <span className="ml-1 text-slate-300">· Live verification status</span>
                      </p>
                    </div>
                    <select
                      aria-label="Activity period"
                      className={`${button} py-1.5! text-[10px]!`}
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                    >
                      <option>Last 7 days</option>
                      <option>Last 30 days</option>
                    </select>
                  </div>
                  <div className="mt-5 flex gap-5 text-[9px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                      Valid
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Modified
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      Inconsistent
                    </span>
                  </div>
                  <svg
                    viewBox="0 0 650 190"
                    className="mt-3 w-full"
                    role="img"
                    aria-label={`Verification activity for ${period}`}
                  >
                    <defs>
                      <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#16a49a" stopOpacity=".15" />
                        <stop offset="100%" stopColor="#16a49a" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[25, 65, 105, 145].map((y, i) => (
                      <g key={y}>
                        <line
                          x1="32"
                          x2="638"
                          y1={y}
                          y2={y}
                          stroke="#edf0f3"
                          strokeDasharray="3 4"
                        />
                        <text x="5" y={y + 3} fontSize="9" fill="#9ba7b2">
                          {60 - i * 20}
                        </text>
                      </g>
                    ))}
                    {(() => {
                      const maxValue = Math.max(
                        1,
                        ...chartBuckets.flatMap((bucket) => [
                          bucket.valid,
                          bucket.modified,
                          bucket.inconsistent,
                        ]),
                      )
                      const point = (value: number, index: number) => {
                        const x = 35 + index * (602 / Math.max(chartBuckets.length - 1, 1))
                        const y = 148 - (value / maxValue) * 123
                        return [x, y] as const
                      }
                      const makePath = (field: 'valid' | 'modified' | 'inconsistent') =>
                        chartBuckets
                          .map((bucket, index) => {
                            const [x, y] = point(bucket[field], index)
                            return `${index === 0 ? 'M' : 'L'}${x} ${y}`
                          })
                          .join(' ')
                      const validPath = makePath('valid')
                      return (
                        <>
                          <path
                            d={`${validPath} L637 148 L35 148Z`}
                            fill="url(#area)"
                          />
                          <path d={validPath} fill="none" stroke="#169c94" strokeWidth="2.5" />
                          <path d={makePath('modified')} fill="none" stroke="#eab64f" strokeWidth="1.5" />
                          <path d={makePath('inconsistent')} fill="none" stroke="#e7888d" strokeWidth="1.5" />
                          {chartBuckets.map((bucket, index) => {
                            if (period === 'Last 7 days' || index % 5 === 0 || index === chartBuckets.length - 1) {
                              const x = 35 + index * (602 / Math.max(chartBuckets.length - 1, 1))
                              const label = new Date(`${bucket.key}T00:00:00Z`).toLocaleDateString(
                                'en-US',
                                period === 'Last 7 days'
                                  ? { weekday: 'short', timeZone: 'UTC' }
                                  : { day: '2-digit', month: 'short', timeZone: 'UTC' },
                              )
                              return (
                                <text key={bucket.key} x={x} y="174" fontSize="9" fill="#8b98a5" textAnchor="middle">
                                  {label}
                                </text>
                              )
                            }
                            return null
                          })}
                        </>
                      )
                    })()}
                  </svg>
                  <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-[10px] text-slate-400">
                    <ShieldCheck size={13} className="text-teal-600" />
                    Every verification compares the PDF fingerprint with its registered proof.
                  </div>
                </Card>
                <Card>
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <h2 className="font-semibold">Network status</h2>
                    <button onClick={() => go('Network overview')} aria-label="View networks">
                      <ArrowUpRight size={16} className="text-slate-400" />
                    </button>
                  </div>
                  <div className="space-y-4 p-5">
                    {[
                      {
                        name: 'Corda',
                        sub: health?.corda.mode === 'mock' ? 'Mock permissioned ledger' : 'Permissioned ledger',
                        icon: Network,
                        configured: health?.corda.configured ?? false,
                        available: health?.status ? true : false,
                        live: health?.corda.mode === 'bridge',
                      },
                      {
                        name: 'Hedera Testnet',
                        sub: health?.hedera.mode === 'mock' ? 'Mock consensus network' : 'Public proof anchoring',
                        icon: Globe2,
                        configured: health?.hedera.configured ?? false,
                        available: health?.status ? true : false,
                        live: health?.hedera.mode === 'testnet',
                      },
                      {
                        name: 'Off-chain storage',
                        sub: 'Private PDF storage',
                        icon: Database,
                        configured: health?.storage.configured ?? true,
                        available: true,
                        live: true,
                      },
                    ].map((n, i) => (
                      <div key={n.name} className="flex items-center gap-3">
                        <div className="rounded-lg border border-slate-200 p-2.5 text-slate-500">
                          <n.icon size={18} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-[11px] font-semibold">{n.name}</h3>
                          <p className="mt-1 text-[9px] text-slate-400">{n.sub}</p>
                        </div>
                        <span
                          className={`flex items-center gap-1 rounded-full px-2 py-1 text-[8px] ${
                            n.available && (n.live || i === 2)
                              ? 'bg-teal-50 text-teal-700'
                              : n.available
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <span className="h-1 w-1 rounded-full bg-current" />
                          {i === 2
                            ? 'Available'
                            : n.live
                              ? 'Connected'
                              : n.available
                                ? 'Mock mode'
                                : 'Not configured'}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-[9px] text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <RefreshCw size={11} />
                        Live network integration required
                      </span>
                      <button onClick={() => go('Synchronization')} className="text-teal-700">
                        Details <span>→</span>
                      </button>
                    </div>
                  </div>
                </Card>
              </div>
              <Card className="mb-5">
                <div className="flex items-center justify-between px-5 pt-4">
                  <h2 className="text-xs font-semibold">From document to trusted proof</h2>
                  <span className="hidden text-[9px] text-slate-400 sm:block">
                    A secure, end-to-end workflow
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-5 p-5 sm:grid-cols-3 xl:grid-cols-6">
                  {steps.map((s, i) => (
                    <button
                      onClick={() =>
                        go(
                          i < 3 ? 'Upload & register' : i === 5 ? 'Verify PDF' : 'Network overview',
                        )
                      }
                      key={s.name}
                      className="group relative flex items-start gap-2.5 text-left"
                    >
                      <span className="rounded-lg bg-[#eff7f6] p-2 text-teal-700 group-hover:bg-teal-100">
                        <s.icon size={16} />
                      </span>
                      <span>
                        <span className="block text-[10px] font-semibold">
                          <span className="mr-1 text-slate-400">{i + 1}.</span>
                          {s.name}
                        </span>
                        <span className="mt-1 block text-[8px] text-slate-400">{s.sub}</span>
                      </span>
                      {i < 5 && (
                        <ChevronRight
                          size={12}
                          className="absolute right-2 top-3 hidden text-slate-300 xl:block"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </Card>
              <Card>{table}</Card>
            </>
          )}
          {page === 'Documents' && <Card>{table}</Card>}
          {['Upload & register', 'Verify PDF'].includes(page) && (
            <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1.7fr_1fr]">
              <Card className="p-7">
                <h2 className="text-lg font-semibold">
                  {page === 'Verify PDF'
                    ? 'Check a document’s authenticity'
                    : 'Register a medical document'}
                </h2>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  {page === 'Verify PDF'
                    ? 'Generate the original SHA-256 fingerprint locally. Your file never leaves this browser during verification.'
                    : 'Upload a pseudonymized PDF. The original is stored privately off-chain; no medical content is published to a ledger.'}
                </p>
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    setFile(e.dataTransfer.files[0] || null)
                    setHash('')
                    setResult('')
                    setReceipt(false)
                  }}
                  className="my-6 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-teal-200 bg-teal-50/40 px-5 py-12 hover:bg-teal-50"
                >
                  <span className="mb-4 rounded-xl bg-white p-3 text-teal-600 shadow-sm">
                    <Upload size={26} />
                  </span>
                  <strong className="text-sm">
                    {file ? 'PDF selected' : 'Drop your PDF here'}
                  </strong>
                  <span className="mt-2 text-xs text-slate-500">
                    or <span className="font-medium text-teal-700">browse files</span>
                  </span>
                  <span className="mt-4 text-[10px] text-slate-400">
                    PDF only · Up to 10 MB · No patient identities
                  </span>
                  <input
                    aria-label="Select PDF"
                    type="file"
                    accept="application/pdf"
                    className="sr-only"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] || null)
                      setHash('')
                      setResult('')
                      setReceipt(false)
                    }}
                  />
                </label>
                {page === 'Verify PDF' ? (
                  <div className="mb-6">
                    <label className="text-xs font-medium">
                      Pseudonymized case ID
                      <input
                        className="mt-2 block w-full rounded-lg border border-slate-200 p-3 text-xs outline-teal-600"
                        placeholder="CASE-XXXXXXXXXXXX"
                        value={caseId}
                        onChange={(e) => setCaseId(e.target.value.toUpperCase())}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="mb-6 grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-medium">
                      Pseudonymized case ID
                      <input
                        className="mt-2 block w-full rounded-lg border border-slate-200 p-3 text-xs outline-teal-600"
                        placeholder="Generated automatically"
                        value={caseId}
                        readOnly
                      />
                    </label>
                    <label className="text-xs font-medium">
                      Document category
                      <select
                        className="mt-2 block w-full rounded-lg border border-slate-200 p-3 text-xs"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {[
                          'Lab report',
                          'Clinical report',
                          'Imaging report',
                          'Discharge summary',
                        ].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
                <button
                  disabled={!file || busy || (page === 'Verify PDF' && !caseId)}
                  onClick={processFile}
                  className={`${primary} w-full`}
                >
                  {busy ? (
                    <LoaderCircle className="animate-spin" size={16} />
                  ) : (
                    <ShieldCheck size={16} />
                  )}{' '}
                  {busy
                    ? 'Processing PDF securely…'
                    : page === 'Verify PDF'
                      ? 'Generate hash & verify'
                      : 'Upload & register document'}
                </button>
                {hash && (
                  <div className="mt-5 rounded-lg border border-slate-200 p-4">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                      SHA-256 fingerprint
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(hash)
                          setNotice('Hash copied')
                        }}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <p className="break-all font-mono text-[10px] leading-5 text-slate-500">
                      {hash}
                    </p>
                  </div>
                )}
                {receipt && (
                  <div className="mt-4 rounded-lg bg-teal-50 p-4 text-teal-800">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <CheckCheck size={18} />
                      PDF stored securely
                    </h3>
                    <p className="mt-2 text-xs leading-6">
                      Case <strong>{caseId}</strong> was registered with SHA-256{' '}
                      <strong>{hash.slice(0, 12)}...</strong>. The synchronization pipeline
                      will publish or retry the Hedera proof when needed.
                    </p>
                  </div>
                )}
                {result && (
                  <div className={`mt-4 rounded-lg p-4 ${tones[result]}`}>
                    <Badge status={result} />
                    <p className="mt-2 text-xs leading-6">
                      {result === 'VALID'
                        ? 'The uploaded PDF matches the Corda record and Hedera proof.'
                        : result === 'MODIFIED'
                          ? 'The uploaded PDF does not match the registered fingerprint.'
                          : result === 'INCONSISTENT'
                            ? 'The Corda record and Hedera proof do not match.'
                            : 'The registration or network proof is unavailable.'}
                    </p>
                  </div>
                )}
              </Card>
              <div className="space-y-5">
                <Card className="p-5">
                  <h3 className="font-semibold">
                    {page === 'Verify PDF' ? 'Understand your results' : 'Registration workflow'}
                  </h3>
                  <div className="mt-5 space-y-5">
                    {page === 'Verify PDF'
                      ? ['VALID', 'MODIFIED', 'INCONSISTENT', 'MISSING'].map((s, i) => (
                          <div key={s}>
                            <Badge status={s} />
                            <p className="mt-2 text-[11px] leading-5 text-slate-500">
                              {
                                [
                                  'The PDF, Corda record, and Hedera proof all match.',
                                  'The PDF differs from its registered fingerprint.',
                                  'The Corda and Hedera records disagree.',
                                  'A required registration or network proof is unavailable.',
                                ][i]
                              }
                            </p>
                          </div>
                        ))
                      : steps.map((s, i) => (
                          <div key={s.name} className="flex gap-3">
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${receipt && i < 3 ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-400'}`}
                            >
                              {receipt && i < 3 ? <Check size={14} /> : i + 1}
                            </span>
                            <div>
                              <h4 className="text-xs font-medium">{s.name}</h4>
                              <p className="mt-1 text-[10px] text-slate-400">{s.sub}</p>
                            </div>
                          </div>
                        ))}
                  </div>
                </Card>
                <div className="flex gap-3 rounded-lg border border-teal-100 bg-teal-50 p-4 text-teal-800">
                  <LockKeyhole size={19} className="shrink-0" />
                  <p className="text-[11px] leading-6">
                    Only pseudonymized case IDs and cryptographic proofs belong in this workspace.
                    Never upload identifiable patient information.
                  </p>
                </div>
              </div>
            </div>
          )}
          {['Synchronization', 'Network overview'].includes(page) && (
            <>
              <div className="mb-5 rounded-xl border border-teal-200 bg-teal-50 p-4 text-xs leading-6 text-teal-800">
                Corda: {health?.corda.mode === 'bridge' ? 'real bridge configured' : 'mock mode'} ·
                {' '}Hedera: {health?.hedera.mode === 'testnet' ? 'real Testnet configured' : 'mock mode'} ·
                {' '}Off-chain storage: {health?.storage.configured ? 'available' : 'unavailable'}
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                {[
                  { name: 'Corda ledger', state: health?.corda.mode === 'bridge' ? 'Connected' : 'Mock mode', detail: health?.corda.mode === 'bridge' ? 'Permissioned ledger bridge' : 'Permissioned ledger simulation' },
                  { name: 'Hedera Testnet', state: health?.hedera.mode === 'testnet' ? 'Connected' : 'Mock mode', detail: health?.hedera.mode === 'testnet' ? health.hedera.topic_id || 'Testnet topic' : 'Consensus simulation' },
                  { name: 'Off-chain storage', state: 'Available', detail: 'Private PDF storage' },
                ].map((network, i) => (
                  <Card key={network.name} className="p-6">
                    <span className="mb-5 inline-block rounded-xl bg-teal-50 p-3 text-teal-700">
                      {i === 0 ? <Network /> : i === 1 ? <Globe2 /> : <Database />}
                    </span>
                    <h2 className="text-lg font-semibold">{network.name}</h2>
                    <div className="my-4">
                      <Badge status={network.state === 'Available' || network.state === 'Connected' ? 'VALID' : 'PENDING'} />
                    </div>
                    <p className="text-xs leading-6 text-slate-500">
                      {network.detail}
                    </p>
                    <dl className="mt-5 space-y-4 border-t border-slate-100 pt-5 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Environment</dt>
                        <dd>{i === 2 ? 'Managed storage' : 'Testnet'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">State</dt>
                        <dd>{network.state}</dd>
                      </div>
                    </dl>
                  </Card>
                ))}
              </div>
              <Card className="mt-5 p-7">
                <h2 className="font-semibold">Synchronization queue</h2>
                {syncStatus?.queue?.length ? (
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-y border-slate-100 text-[10px] text-slate-500">
                        <tr>
                          <th className="px-3 py-3">Case ID</th>
                          <th className="px-3 py-3">Corda transaction</th>
                          <th className="px-3 py-3">Hedera sequence</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-3 py-3">Attempts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {syncStatus.queue.map((row) => (
                          <tr key={String(row.corda_tx_id)} className="border-b border-slate-100">
                            <td className="px-3 py-3 font-semibold">{String(row.case_id)}</td>
                            <td className="px-3 py-3 font-mono text-[10px]">{String(row.corda_tx_id)}</td>
                            <td className="px-3 py-3">{row.hedera_sequence == null ? '—' : String(row.hedera_sequence)}</td>
                            <td className="px-3 py-3"><Badge status={String(row.status)} /></td>
                            <td className="px-3 py-3">{String(row.attempts)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-14 text-center">
                    <RefreshCw className="mx-auto mb-4 text-slate-300" size={30} />
                    <h3 className="font-medium">No synchronization events</h3>
                    <p className="mt-2 text-xs text-slate-400">
                      Register a PDF to generate the first Corda synchronization event.
                    </p>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  <button className={button} onClick={refreshLiveData}>
                    <RefreshCw size={14} /> Refresh status
                  </button>
                  <button
                    className={button}
                    onClick={async () => {
                      await fetch('/api/pipeline/run', { method: 'POST' })
                      await refreshLiveData()
                    }}
                  >
                    Run synchronization
                  </button>
                </div>
              </Card>
            </>
          )}
          {page === 'Settings' && (
            <div className="max-w-3xl space-y-5">
              <Card className="p-6">
                <h2 className="font-semibold">Workspace preferences</h2>
                <p className="mt-2 text-xs text-slate-400">
                  Display preferences apply to this session.
                </p>
                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                  <div>
                    <h3 className="text-xs font-medium">Activity notifications</h3>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Show verification activity alerts in this session.
                    </p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={alerts}
                    aria-label="Activity notifications"
                    onClick={() => setAlerts(!alerts)}
                    className={`h-6 w-10 rounded-full p-1 ${alerts ? 'bg-teal-600' : 'bg-slate-300'}`}
                  >
                    <span
                      className={`block h-4 w-4 rounded-full bg-white transition ${alerts ? 'translate-x-4' : ''}`}
                    />
                  </button>
                </div>
              </Card>
              <Card className="p-6">
                <h2 className="font-semibold">Security & integrations</h2>
                <p className="mt-3 text-xs leading-7 text-slate-500">
                  Hash algorithm: <strong className="text-slate-700">SHA-256</strong>
                  <br />
                  Document storage: <strong className="text-slate-700">Private, off-chain</strong>
                  <br />
                  Corda integration:{' '}
                  <strong className="text-slate-700">
                    {health?.corda.mode === 'bridge' ? 'Real bridge' : 'Mock mode'}
                  </strong>
                  <br />
                  Hedera Testnet integration:{' '}
                  <strong className="text-slate-700">
                    {health?.hedera.mode === 'testnet' ? 'Connected to Testnet' : 'Mock mode'}
                  </strong>
                </p>
                <div className="mt-5 rounded-lg bg-slate-50 p-4 text-xs leading-6 text-slate-500">
                  Network credentials must be configured server-side. Never put private keys in
                  document records or browser preferences.
                </div>
              </Card>
            </div>
          )}
          <footer className="mt-6 flex flex-wrap justify-between gap-2 text-[9px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <LockKeyhole size={11} />
              Built for trust. Designed for privacy.
            </span>
            <span>
              Powered by Corda · Hedera · SHA-256 <span className="mx-2">|</span> Testnet
              environment
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex max-w-md items-start gap-3 rounded-xl border border-teal-100 bg-white p-5 text-xs leading-6 shadow-xl"
        >
          <Check size={18} className="mt-1 shrink-0 text-teal-600" />
          {notice}
          <button aria-label="Dismiss" onClick={() => setNotice('')}>
            <X size={14} />
          </button>
        </div>
      )}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-5 backdrop-blur-[2px]"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Document details"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-teal-50 p-3 text-teal-700">
                <FileCheck2 size={24} />
              </span>
              <button aria-label="Close details" onClick={() => setSelected(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="my-5 flex items-center gap-3">
              <h2 className="text-2xl font-semibold">{selected.caseId}</h2>
              <Badge status={selected.status} />
            </div>
            <p className="mb-5 text-xs text-slate-400">
              {selected.category} · Registered record · {new Date(selected.createdAt).toUTCString()}
            </p>
            {[
              ['SHA-256 fingerprint', selected.hash],
              ['Corda transaction ID', selected.cordaTx],
              ['Hedera proof hash', selected.hederaHash],
              ['Hedera consensus sequence', selected.hederaSequence],
            ].map(([label, value]) => (
              <div key={label} className="mb-3 rounded-lg border border-slate-200 p-4">
                <div className="mb-2 flex items-center justify-between text-xs font-medium">
                  {label}
                  {value && (
                    <button
                      aria-label={`Copy ${label}`}
                      onClick={() => {
                        navigator.clipboard.writeText(value)
                        setNotice('Copied to clipboard')
                      }}
                    >
                      <Copy size={13} />
                    </button>
                  )}
                </div>
                <p className="break-all font-mono text-[11px] leading-6 text-slate-500">
                  {value || 'Pending — no proof available'}
                </p>
              </div>
            ))}
            <p className="my-4 rounded-lg bg-amber-50 p-3 text-[11px] leading-6 text-amber-800">
              The identifier and proof shown here correspond to this registered document.
            </p>
            <button
              className={`${primary} w-full`}
              onClick={() => {
                setCaseId(selected.caseId)
                go('Verify PDF')
              }}
            >
              Verify a PDF
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

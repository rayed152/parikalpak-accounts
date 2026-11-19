import { useEffect, useState, useMemo } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { ipc, formatDate, formatAmount } from '../lib/ipc'
import Pagination from '../components/Pagination'
import GroupPanel, { type GColumn } from '../components/GroupPanel'
import type { DebitEntry, CreditEntry, ProjectEntry } from '../lib/types'

type EntryType = 'debit' | 'credit' | 'project'
type SortKey = 'type' | 'date' | 'description' | 'amount' | 'ledgerSerial'
type SortDir = 'asc' | 'desc'

interface CombinedRow {
  id: string
  type: EntryType
  ledgerSerial: number       // cross-type insertion order: 1, 2, 3...
  serialNumber: number       // per-type serial (for GroupPanel)
  date: string
  createdAt: string          // actual DB insertion time, used for ordering
  description: string
  extra: string | null       // reference (credit) | projectCode (project) | null (debit)
  amount: number
  receivedAmount?: number    // project only
}

function TypeBadge({ type, active, onClick }: { type: EntryType; active: boolean; onClick: () => void }) {
  const styles: Record<EntryType, string> = {
    debit:   active ? 'bg-red-600 text-white ring-2 ring-red-400'      : 'bg-red-100 text-red-700 hover:bg-red-200',
    credit:  active ? 'bg-green-600 text-white ring-2 ring-green-400'  : 'bg-green-100 text-green-700 hover:bg-green-200',
    project: active ? 'bg-blue-600 text-white ring-2 ring-blue-400'    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
  }
  const labels: Record<EntryType, string> = { debit: 'Debit', credit: 'Credit', project: 'Project' }
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none ${styles[type]}`}
      title={`Click to show all ${labels[type]} entries`}
    >
      {labels[type]}
      <ChevronDown size={10} className={`transition-transform ${active ? 'rotate-180' : ''}`} />
    </button>
  )
}

export default function LedgerPage() {
  const [debits,   setDebits]   = useState<DebitEntry[]>([])
  const [credits,  setCredits]  = useState<CreditEntry[]>([])
  const [projects, setProjects] = useState<ProjectEntry[]>([])
  const [loading,  setLoading]  = useState(true)

  const [sortKey,  setSortKey]  = useState<SortKey>('ledgerSerial')
  const [sortDir,  setSortDir]  = useState<SortDir>('asc')
  const [search,   setSearch]   = useState('')
  const [page,     setPage]     = useState(1)
  const [perPage,  setPerPage]  = useState(25)
  const [grouped,     setGrouped]     = useState<EntryType | null>(null)
  const [groupedDesc, setGroupedDesc] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [d, c, p] = await Promise.all([
        ipc.debit.getAll(),
        ipc.credit.getAll(),
        ipc.project.getAll()
      ])
      setDebits(d)
      setCredits(c)
      setProjects(p)
    } catch { toast.error('Failed to load transactions') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { setPage(1) }, [search, sortKey, sortDir, perPage, grouped, groupedDesc])

  // ── Merge into combined rows, sorted by createdAt, then assign ledger serials ──
  const combined: CombinedRow[] = useMemo(() => {
    const d = debits.map(r => ({
      id: r.id, type: 'debit' as EntryType, serialNumber: r.serialNumber,
      date: r.date, createdAt: r.createdAt, description: r.particulars,
      extra: null, amount: r.amount, ledgerSerial: 0
    }))
    const c = credits.map(r => ({
      id: r.id, type: 'credit' as EntryType, serialNumber: r.serialNumber,
      date: r.date, createdAt: r.createdAt, description: r.particulars,
      extra: r.reference ?? null, amount: r.amount, ledgerSerial: 0
    }))
    const p = projects.map(r => ({
      id: r.id, type: 'project' as EntryType, serialNumber: r.serialNumber,
      date: r.submitDate, createdAt: r.createdAt, description: r.subject,
      extra: r.projectCode, amount: r.amount, receivedAmount: r.receivedAmount, ledgerSerial: 0
    }))
    const merged = [...d, ...c, ...p]
    merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    merged.forEach((row, i) => { row.ledgerSerial = i + 1 })
    return merged
  }, [debits, credits, projects])

  // ── Filter ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return combined
    return combined.filter(r =>
      [r.type, r.serialNumber.toString(), r.date.split('T')[0],
       r.description, r.extra ?? '', String(r.amount)]
        .some(f => f.toLowerCase().includes(q))
    )
  }, [combined, search])

  // ── Sort ──────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date')          cmp = new Date(a.date).getTime() - new Date(b.date).getTime()
      else if (sortKey === 'amount')   cmp = a.amount - b.amount
      else if (sortKey === 'ledgerSerial') cmp = a.ledgerSerial - b.ledgerSerial
      else cmp = String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
  const paginated  = sorted.slice((page - 1) * perPage, page * perPage)

  // ── Grouped panel data (by type) ─────────────────────────────
  const groupedDebitRows   = debits
  const groupedCreditRows  = credits
  const groupedProjectRows = projects

  const groupedTotal = useMemo(() => {
    if (grouped === 'debit')   return debits.reduce((s, r)   => s + r.amount, 0)
    if (grouped === 'credit')  return credits.reduce((s, r)  => s + r.amount, 0)
    if (grouped === 'project') return projects.reduce((s, r) => s + r.receivedAmount, 0)
    return 0
  }, [grouped, debits, credits, projects])

  // ── Grouped panel data (by description) ──────────────────────
  const groupedDescRows = useMemo(
    () => groupedDesc ? combined.filter(r => r.description === groupedDesc) : [],
    [combined, groupedDesc]
  )
  const groupedDescTotal = useMemo(
    () => groupedDescRows.reduce((s, r) => s + (r.type === 'project' && r.receivedAmount !== undefined ? r.receivedAmount : r.amount), 0),
    [groupedDescRows]
  )

  function toggleGroup(type: EntryType) {
    setGroupedDesc(null)
    setGrouped(prev => prev === type ? null : type)
  }

  function toggleGroupDesc(desc: string) {
    setGrouped(null)
    setGroupedDesc(prev => prev === desc ? null : desc)
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? <span className="ml-1 text-blue-500 text-xs">{sortDir === 'asc' ? '▲' : '▼'}</span>
      : <span className="ml-1 text-slate-300 text-xs opacity-0 group-hover:opacity-100">▲</span>

  // ── GroupPanel column definitions (per type) ──────────────────
  const debitGroupCols: GColumn[] = [
    { label: 'S/N',         render: r => <span className="font-mono text-slate-500 text-xs">{r.serialNumber}</span> },
    { label: 'Date',        render: r => <span className="text-slate-600 whitespace-nowrap">{formatDate(r.date)}</span> },
    { label: 'Particulars', render: r => <span className="text-slate-800 font-medium">{r.particulars}</span> },
    { label: 'Amount (Tk)', render: r => <span className="text-red-600 font-semibold">{formatAmount(r.amount)}</span> }
  ]

  const creditGroupCols: GColumn[] = [
    { label: 'S/N',         render: r => <span className="font-mono text-slate-500 text-xs">{r.serialNumber}</span> },
    { label: 'Date',        render: r => <span className="text-slate-600 whitespace-nowrap">{formatDate(r.date)}</span> },
    { label: 'Reference',   render: r => <span className="text-slate-500 text-xs">{r.reference ?? '-'}</span> },
    { label: 'Particulars', render: r => <span className="text-slate-800 font-medium">{r.particulars}</span> },
    { label: 'Amount (Tk)', render: r => <span className="text-green-600 font-semibold">{formatAmount(r.amount)}</span> }
  ]

  const projectGroupCols: GColumn[] = [
    { label: 'S/N',              render: r => <span className="font-mono text-slate-500 text-xs">{r.serialNumber}</span> },
    { label: 'Code',             render: r => <span className="text-blue-600 font-mono text-xs">{r.projectCode}</span> },
    { label: 'Subject',          render: r => <span className="text-slate-800 font-medium">{r.subject}</span> },
    { label: 'Submit Date',      render: r => <span className="text-slate-600 whitespace-nowrap">{formatDate(r.submitDate)}</span> },
    { label: 'Amount',           render: r => <span className="text-slate-700 font-semibold">{formatAmount(r.amount)}</span> },
    { label: 'Received (90%)',   render: r => <span className="text-green-600 font-semibold">{formatAmount(r.receivedAmount)}</span> }
  ]

  // ── Description GroupPanel columns (operates on CombinedRow) ─
  const descGroupCols: GColumn[] = [
    { label: '#',           render: r => <span className="font-mono text-slate-500 text-xs">{r.ledgerSerial}</span> },
    { label: 'Type',        render: r => <TypeBadge type={r.type} active={false} onClick={() => {}} /> },
    { label: 'Date',        render: r => <span className="text-slate-600 whitespace-nowrap">{formatDate(r.date)}</span> },
    { label: 'Description', render: r => <span className="text-slate-800 font-medium">{r.description}</span> },
    { label: 'Ref / Code',  render: r => <span className="text-slate-500 text-xs font-mono">{r.extra ?? '-'}</span> },
    {
      label: 'Amount (Tk)',
      render: r => (
        <span className={r.type === 'debit' ? 'text-red-600 font-semibold' : r.type === 'credit' ? 'text-green-600 font-semibold' : 'text-blue-600 font-semibold'}>
          {formatAmount(r.type === 'project' && r.receivedAmount !== undefined ? r.receivedAmount : r.amount)}
          {r.type === 'project' && <span className="ml-1 text-xs text-slate-400 font-normal">(90%)</span>}
        </span>
      )
    }
  ]

  // ── Summary counts ────────────────────────────────────────────
  const counts = { debit: debits.length, credit: credits.length, project: projects.length }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search all transactions..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Type summary pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['debit', 'credit', 'project'] as EntryType[]).map(t => (
            <button
              key={t}
              onClick={() => toggleGroup(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                grouped === t
                  ? t === 'debit'   ? 'bg-red-600 text-white border-red-600'
                  : t === 'credit'  ? 'bg-green-600 text-white border-green-600'
                  :                   'bg-blue-600 text-white border-blue-600'
                  : t === 'debit'   ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  : t === 'credit'  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                  :                   'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <span className="capitalize">{t}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${grouped === t ? 'bg-white/30' : 'bg-white/80'}`}>
                {counts[t]}
              </span>
              <ChevronDown size={11} className={`transition-transform ${grouped === t ? 'rotate-180' : ''}`} />
            </button>
          ))}
        </div>

        <span className="text-sm text-slate-400 ml-auto">{filtered.length} of {combined.length} total</span>
      </div>

      {/* Combined table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th onClick={() => handleSort('type')} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:bg-slate-100 select-none">
                  Type<SortIcon k="type" />
                </th>
                <th onClick={() => handleSort('ledgerSerial')} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:bg-slate-100 select-none">
                  S/N<SortIcon k="ledgerSerial" />
                </th>
                <th onClick={() => handleSort('date')} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:bg-slate-100 select-none">
                  Date<SortIcon k="date" />
                </th>
                <th onClick={() => handleSort('description')} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:bg-slate-100 select-none">
                  Description<SortIcon k="description" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Ref / Code
                </th>
                <th onClick={() => handleSort('amount')} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:bg-slate-100 select-none">
                  Amount (Tk)<SortIcon k="amount" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  {search ? 'No transactions match your search.' : 'No transactions yet.'}
                </td></tr>
              ) : paginated.map((row, i) => {
                const isTypeActive = grouped === row.type
                const isDescActive = groupedDesc === row.description
                return (
                  <tr
                    key={`${row.type}-${row.id}`}
                    className={`transition-colors ${
                      isTypeActive
                        ? row.type === 'debit'   ? 'bg-red-50/60 ring-1 ring-inset ring-red-200'
                        : row.type === 'credit'  ? 'bg-green-50/60 ring-1 ring-inset ring-green-200'
                        :                          'bg-blue-50/60 ring-1 ring-inset ring-blue-200'
                        : isDescActive
                        ? 'bg-amber-50/60 ring-1 ring-inset ring-amber-200'
                        : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <TypeBadge type={row.type} active={isTypeActive} onClick={() => toggleGroup(row.type)} />
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">{row.ledgerSerial}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleGroupDesc(row.description)}
                        className={`text-left font-medium max-w-[200px] truncate flex items-center gap-1 group transition-colors ${isDescActive ? 'text-amber-700' : 'text-slate-800 hover:text-amber-600'}`}
                        title={`Click to group by "${row.description}"`}
                      >
                        <span className="truncate">{row.description}</span>
                        <ChevronDown size={12} className={`flex-shrink-0 transition-transform ${isDescActive ? 'rotate-180 text-amber-600' : 'text-slate-400 group-hover:text-amber-500'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono">{row.extra ?? '-'}</td>
                    <td className={`px-4 py-3 font-semibold ${
                      row.type === 'debit'   ? 'text-red-600'
                      : row.type === 'credit' ? 'text-green-600'
                      : 'text-slate-700'
                    }`}>
                      {formatAmount(row.type === 'project' && row.receivedAmount !== undefined ? row.receivedAmount : row.amount)}
                      {row.type === 'project' && (
                        <span className="ml-1 text-xs text-slate-400 font-normal">(90%)</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {paginated.length > 0 && (() => {
              const totalD = debits.reduce((s, r) => s + r.amount, 0)
              const totalC = credits.reduce((s, r) => s + r.amount, 0)
              const totalP = projects.reduce((s, r) => s + r.receivedAmount, 0)
              const balance = totalC + totalP - totalD
              return (
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Summary
                    </td>
                    <td className="px-4 py-3 text-xs space-y-1">
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Debit (খরচ)</span>
                        <span className="text-red-700 font-semibold">{formatAmount(totalD)} Tk</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Credit (জমা)</span>
                        <span className="text-green-700 font-semibold">{formatAmount(totalC)} Tk</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Project (90%)</span>
                        <span className="text-blue-700 font-semibold">{formatAmount(totalP)} Tk</span>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-slate-300 pt-1 mt-1">
                        <span className="text-slate-700 font-bold">Balance</span>
                        <span className={`font-bold ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {balance < 0 ? '−' : ''}{formatAmount(Math.abs(balance))} Tk
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              )
            })()}
          </table>
        </div>
        <Pagination
          page={page} totalPages={totalPages} perPage={perPage}
          total={sorted.length} onPage={setPage}
          onPerPage={n => { setPerPage(n); setPage(1) }}
        />
      </div>

      {/* Grouped drill-down panel */}
      {grouped === 'debit' && (
        <GroupPanel
          fieldLabel="Type" value="Debit (খরচ)"
          rows={groupedDebitRows}
          columns={debitGroupCols}
          totalAmount={groupedTotal}
          onClose={() => setGrouped(null)}
        />
      )}
      {grouped === 'credit' && (
        <GroupPanel
          fieldLabel="Type" value="Credit (জমা)"
          rows={groupedCreditRows}
          columns={creditGroupCols}
          totalAmount={groupedTotal}
          onClose={() => setGrouped(null)}
        />
      )}
      {grouped === 'project' && (
        <GroupPanel
          fieldLabel="Type" value="Project"
          rows={groupedProjectRows}
          columns={projectGroupCols}
          totalAmount={groupedTotal}
          onClose={() => setGrouped(null)}
        />
      )}
      {groupedDesc && (
        <GroupPanel
          fieldLabel="Description" value={groupedDesc}
          rows={groupedDescRows}
          columns={descGroupCols}
          totalAmount={groupedDescTotal}
          onClose={() => setGroupedDesc(null)}
        />
      )}
    </div>
  )
}

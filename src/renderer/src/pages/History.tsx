import { useEffect, useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { ipc, formatDate, formatAmount } from '../lib/ipc'
import type { DebitEntry, CreditEntry, ProjectEntry } from '../lib/types'

type Tab = 'debit' | 'credit' | 'project'
type SortDir = 'asc' | 'desc'

function getYears(dates: string[]): string[] {
  const years = [...new Set(dates.map(d => new Date(d).getFullYear().toString()))]
  return years.sort((a, b) => Number(b) - Number(a))
}

function matchesSearch(fields: string[], q: string): boolean {
  if (!q) return true
  const lq = q.toLowerCase()
  return fields.some(f => f.toLowerCase().includes(lq))
}

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>('debit')
  const [debits, setDebits] = useState<DebitEntry[]>([])
  const [credits, setCredits] = useState<CreditEntry[]>([])
  const [projects, setProjects] = useState<ProjectEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [month, setMonth] = useState('')
  const [sortKey, setSortKey] = useState('serialNumber')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  async function load() {
    setLoading(true)
    try {
      const [d, c, p] = await Promise.all([ipc.debit.getHistory(), ipc.credit.getHistory(), ipc.project.getHistory()])
      setDebits(d)
      setCredits(c)
      setProjects(p)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Derive years from current tab data
  const allDates = useMemo(() => {
    if (tab === 'debit') return debits.map(r => r.date)
    if (tab === 'credit') return credits.map(r => r.date)
    return projects.map(r => r.submitDate)
  }, [tab, debits, credits, projects])

  const years = useMemo(() => getYears(allDates), [allDates])

  // Algorithm 8: filter + sort
  const filteredDebits = useMemo(() => {
    let rows = debits.filter(r => {
      const d = new Date(r.date)
      if (year && d.getFullYear().toString() !== year) return false
      if (month !== '' && d.getMonth().toString() !== month) return false
      return matchesSearch([r.serialNumber.toString(), r.date.split('T')[0], r.particulars, String(r.amount), String(r.total)], search)
    })
    return rows.sort((a, b) => {
      const av = (a as any)[sortKey] ?? '', bv = (b as any)[sortKey] ?? ''
      let cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [debits, year, month, search, sortKey, sortDir])

  const filteredCredits = useMemo(() => {
    let rows = credits.filter(r => {
      const d = new Date(r.date)
      if (year && d.getFullYear().toString() !== year) return false
      if (month !== '' && d.getMonth().toString() !== month) return false
      return matchesSearch([r.serialNumber.toString(), r.date.split('T')[0], r.particulars, String(r.amount), String(r.total)], search)
    })
    return rows.sort((a, b) => {
      const av = (a as any)[sortKey] ?? '', bv = (b as any)[sortKey] ?? ''
      let cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [credits, year, month, search, sortKey, sortDir])

  const filteredProjects = useMemo(() => {
    let rows = projects.filter(r => {
      const d = new Date(r.submitDate)
      if (year && d.getFullYear().toString() !== year) return false
      if (month !== '' && d.getMonth().toString() !== month) return false
      return matchesSearch([r.serialNumber.toString(), r.submitDate.split('T')[0], r.subject, r.projectCode, String(r.amount)], search)
    })
    return rows.sort((a, b) => {
      const av = (a as any)[sortKey] ?? '', bv = (b as any)[sortKey] ?? ''
      let cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [projects, year, month, search, sortKey, sortDir])

  function handleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ k }: { k: string }) =>
    sortKey === k ? <span className="ml-1 text-blue-500">{sortDir === 'asc' ? '▲' : '▼'}</span> : <span className="ml-1 text-slate-300">▲</span>

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  const thCls = "px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap"

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 w-fit shadow-sm">
        {(['debit', 'credit', 'project'] as Tab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); setSortKey('serialNumber'); setSortDir('asc') }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
            {t === 'project' ? 'Projects' : t === 'debit' ? 'Debits' : 'Credits'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search..." className="pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
        </div>
        <select value={year} onChange={e => setYear(e.target.value)} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Months</option>
          {MONTHS.map((m, i) => <option key={i} value={String(i)}>{m}</option>)}
        </select>
        <button onClick={() => { setSearch(''); setYear(new Date().getFullYear().toString()); setMonth('') }} className="text-xs text-slate-500 hover:text-slate-700 underline">Reset</button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading...</div>
          ) : tab === 'debit' ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {[['serialNumber','S/N'],['date','Date'],['particulars','Particulars'],['amount','Amount'],['total','Total']].map(([k,l]) => (
                    <th key={k} onClick={() => handleSort(k)} className={thCls}>{l}<SortIcon k={k} /></th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDebits.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No historical debit entries found</td></tr>
                ) : filteredDebits.map((row, i) => (
                  <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">{row.serialNumber}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-4 py-3 text-slate-800 max-w-xs truncate">{row.particulars}</td>
                    <td className="px-4 py-3 text-red-600 font-semibold">{formatAmount(row.amount)}</td>
                    <td className="px-4 py-3 text-blue-600 font-semibold">{formatAmount(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === 'credit' ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {[['serialNumber','S/N'],['date','Date'],['reference','Reference'],['purpose','Purpose'],['particulars','Particulars'],['amount','Amount'],['total','Total']].map(([k,l]) => (
                    <th key={k} onClick={() => handleSort(k)} className={thCls}>{l}<SortIcon k={k} /></th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCredits.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No historical credit entries found</td></tr>
                ) : filteredCredits.map((row, i) => (
                  <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">{row.serialNumber}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{row.reference ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[100px] truncate">{row.purpose ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-800 max-w-xs truncate">{row.particulars}</td>
                    <td className="px-4 py-3 text-green-600 font-semibold">{formatAmount(row.amount)}</td>
                    <td className="px-4 py-3 text-blue-600 font-semibold">{formatAmount(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {[['serialNumber','S/N'],['projectCode','Code'],['subject','Subject'],['submitDate','Submit Date'],['receiveDate','Receive Date'],['bank','Bank'],['amount','Amount'],['receivedAmount','Received (90%)']].map(([k,l]) => (
                    <th key={k} onClick={() => handleSort(k)} className={thCls}>{l}<SortIcon k={k} /></th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No historical projects found</td></tr>
                ) : filteredProjects.map((row, i) => (
                  <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">{row.serialNumber}</td>
                    <td className="px-4 py-3 text-blue-600 font-medium text-xs font-mono">{row.projectCode}</td>
                    <td className="px-4 py-3 text-slate-800 max-w-[160px] truncate">{row.subject}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(row.submitDate)}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{row.receiveDate ? formatDate(row.receiveDate) : '-'}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{row.bank || '-'}</td>
                    <td className="px-4 py-3 text-slate-800 font-semibold">{formatAmount(row.amount)}</td>
                    <td className="px-4 py-3 text-green-600 font-semibold">{formatAmount(row.receivedAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">
          Showing {tab === 'debit' ? filteredDebits.length : tab === 'credit' ? filteredCredits.length : filteredProjects.length} records
        </div>
      </div>
    </div>
  )
}

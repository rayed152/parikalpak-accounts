import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface Props {
  page: number
  totalPages: number
  perPage: number
  total: number
  onPage: (p: number) => void
  onPerPage: (n: number) => void
}

function getPageRange(page: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, total])
  for (let i = page - 2; i <= page + 2; i++) if (i >= 1 && i <= total) set.add(i)
  const sorted = [...set].sort((a, b) => a - b)
  const result: (number | '...')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) result.push('...')
    result.push(p)
  })
  return result
}

const btnCls = 'flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-colors'
const activeCls = 'bg-blue-600 text-white shadow-sm'
const normalCls = 'text-slate-600 hover:bg-slate-100'
const disabledCls = 'text-slate-300 cursor-not-allowed'

export default function Pagination({ page, totalPages, perPage, total, onPage, onPerPage }: Props) {
  if (total === 0) return null
  const start = Math.min((page - 1) * perPage + 1, total)
  const end = Math.min(page * perPage, total)
  const pages = getPageRange(page, totalPages)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white rounded-b-xl flex-wrap gap-2">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span>
          Showing <span className="font-semibold text-slate-700">{start}–{end}</span> of{' '}
          <span className="font-semibold text-slate-700">{total}</span>
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs">Per page:</span>
          <select
            value={perPage}
            onChange={e => onPerPage(Number(e.target.value))}
            className="text-xs border border-slate-300 rounded-md px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={() => onPage(1)} disabled={page === 1} className={`${btnCls} ${page === 1 ? disabledCls : normalCls}`}>
          <ChevronsLeft size={14} />
        </button>
        <button onClick={() => onPage(page - 1)} disabled={page === 1} className={`${btnCls} ${page === 1 ? disabledCls : normalCls}`}>
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, i) =>
          p === '...'
            ? <span key={`e${i}`} className="w-8 text-center text-slate-400 text-sm">…</span>
            : <button key={p} onClick={() => onPage(p as number)} className={`${btnCls} ${page === p ? activeCls : normalCls}`}>
                {p}
              </button>
        )}

        <button onClick={() => onPage(page + 1)} disabled={page === totalPages} className={`${btnCls} ${page === totalPages ? disabledCls : normalCls}`}>
          <ChevronRight size={14} />
        </button>
        <button onClick={() => onPage(totalPages)} disabled={page === totalPages} className={`${btnCls} ${page === totalPages ? disabledCls : normalCls}`}>
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  )
}

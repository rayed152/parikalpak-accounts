import { type ReactNode } from 'react'
import { X, Hash } from 'lucide-react'
import { formatAmount } from '../lib/ipc'

export interface GColumn {
  label: string
  render: (row: any) => ReactNode
  className?: string
}

interface Props {
  fieldLabel: string
  value: string
  rows: any[]
  columns: GColumn[]
  totalAmount: number
  onClose: () => void
}

export default function GroupPanel({ fieldLabel, value, rows, columns, totalAmount, onClose }: Props) {
  return (
    <div className="border-2 border-blue-300 rounded-xl overflow-hidden shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Hash size={14} className="opacity-80" />
            <span className="text-sm font-semibold">{fieldLabel}:</span>
            <span className="text-sm font-bold">"{value}"</span>
          </div>
          <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">
            {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
          </span>
          <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">
            Total: {formatAmount(totalAmount)} Tk
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Sub-table */}
      <div className="overflow-x-auto bg-blue-50/40">
        <table className="w-full text-sm">
          <thead className="bg-blue-100/60 border-b border-blue-200">
            <tr>
              {columns.map(col => (
                <th
                  key={col.label}
                  className="px-4 py-2.5 text-left text-xs font-semibold text-blue-800 uppercase tracking-wide"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-blue-400 text-sm">
                  No entries found
                </td>
              </tr>
            ) : rows.map((row, i) => (
              <tr key={row.id} className={i % 2 === 0 ? 'bg-white/70' : 'bg-blue-50/60'}>
                {columns.map(col => (
                  <td key={col.label} className={`px-4 py-2.5 ${col.className ?? ''}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-blue-300 bg-blue-100/60">
            <tr>
              <td
                colSpan={columns.length - 1}
                className="px-4 py-2.5 text-xs font-bold text-blue-800 uppercase"
              >
                Grand Total
              </td>
              <td className="px-4 py-2.5 text-blue-800 font-bold text-sm">
                {formatAmount(totalAmount)} Tk
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

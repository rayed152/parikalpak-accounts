import { AlertTriangle } from 'lucide-react'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  confirmClass?: string
  onCancel: () => void
  onConfirm: () => void
  loading?: boolean
}

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', confirmClass = 'bg-red-600 hover:bg-red-700', onCancel, onConfirm, loading = false }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-start gap-4">
          <div className="bg-red-100 p-2.5 rounded-full flex-shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
            <p className="text-slate-500 text-sm mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-60 ${confirmClass}`}>
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

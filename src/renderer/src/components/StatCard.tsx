import { LucideIcon } from 'lucide-react'
import { formatAmount } from '../lib/ipc'

interface Props {
  title: string
  value: number | string
  icon: LucideIcon
  color: 'green' | 'red' | 'blue' | 'purple'
  isMoney?: boolean
}

const colors = {
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600',  val: 'text-green-700' },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',      val: 'text-red-700'   },
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',    val: 'text-blue-700'  },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', val: 'text-purple-700' }
}

export default function StatCard({ title, value, icon: Icon, color, isMoney = true }: Props) {
  const c = colors[color]
  const display = isMoney && typeof value === 'number' ? `${formatAmount(value)} Tk` : String(value)

  return (
    <div className={`${c.bg} rounded-xl p-5 border border-white shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">{title}</p>
          <p className={`${c.val} text-2xl font-bold mt-1`}>{display}</p>
        </div>
        <div className={`${c.icon} p-2.5 rounded-lg`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

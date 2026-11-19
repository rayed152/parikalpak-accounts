import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Wallet, Briefcase } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as PTooltip
} from 'recharts'
import { ipc, formatDate, formatAmount } from '../lib/ipc'
import StatCard from '../components/StatCard'
import type { DashboardStats, ChartData, RecentTransaction } from '../lib/types'

const PIE_COLORS = ['#ef4444', '#22c55e'] // Debit=red(খরচ), Credit=green(জমা)

function CustomPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${name}: ${(percent * 100).toFixed(1)}%`}
    </text>
  )
}

function PieTooltip({ active, payload }: any) {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium text-slate-700">{payload[0].name}</p>
        <p className="text-slate-900">{formatAmount(payload[0].value)} Tk</p>
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [recent, setRecent] = useState<{ debits: RecentTransaction[]; credits: RecentTransaction[] }>({ debits: [], credits: [] })
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const [s, c, r] = await Promise.all([
        ipc.dashboard.getStats(),
        ipc.dashboard.getChartData(),
        ipc.dashboard.getRecentTransactions()
      ])
      setStats(s)
      setChartData(c)
      setRecent(r)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const pieData = stats
    ? [{ name: 'Debit (খরচ)', value: stats.totalDebit }, { name: 'Credit (জমা)', value: stats.totalCredit }]
    : []

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-500">Loading...</div>
  )

  return (
    <div className="space-y-6">
      {/* Stats — Credit=জমা(income/green), Debit=খরচ(expense/red) */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard title="Total Credit (জমা)" value={stats?.totalCredit ?? 0} icon={TrendingUp} color="green" />
        <StatCard title="Project Received" value={stats?.totalProjectReceived ?? 0} icon={Briefcase} color="blue" />
        <StatCard title="Total Debit (খরচ)" value={stats?.totalDebit ?? 0} icon={TrendingDown} color="red" />
        <StatCard title="Balance" value={stats?.balance ?? 0} icon={Wallet} color={stats && stats.balance >= 0 ? 'blue' : 'red'} />
        <StatCard title="Total Projects" value={stats?.totalProjects ?? 0} icon={Briefcase} color="purple" isMoney={false} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Monthly Debit vs Credit</h2>
          {chartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RTooltip formatter={(v: number) => `${formatAmount(v)} Tk`} />
                <Legend />
                <Bar dataKey="credit" name="Credit (জমা)" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="debit" name="Debit (খরচ)" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="col-span-2 bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Transaction Breakdown</h2>
          {!stats || (stats.totalDebit === 0 && stats.totalCredit === 0) ? (
            <div className="h-56 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={CustomPieLabel} outerRadius={90} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <PTooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex justify-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Debit (খরচ)
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Credit (জমা)
            </span>
          </div>
        </div>
      </div>

      {/* Recent Transactions — Credit(জমা) first, Debit(খরচ) second */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent Credits (জমা — income) */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Recent Credits (জমা)
          </h2>
          {recent.credits.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">No entries</p>
          ) : (
            <div className="space-y-2">
              {recent.credits.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700 truncate max-w-[180px]">{t.particulars}</p>
                    <p className="text-xs text-slate-400">{formatDate(t.date)} · #{t.serialNumber}</p>
                  </div>
                  <span className="text-green-600 font-semibold text-sm">{formatAmount(t.amount)} Tk</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Debits (খরচ — expense) */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Recent Debits (খরচ)
          </h2>
          {recent.debits.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">No entries</p>
          ) : (
            <div className="space-y-2">
              {recent.debits.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700 truncate max-w-[180px]">{t.particulars}</p>
                    <p className="text-xs text-slate-400">{formatDate(t.date)} · #{t.serialNumber}</p>
                  </div>
                  <span className="text-red-600 font-semibold text-sm">{formatAmount(t.amount)} Tk</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

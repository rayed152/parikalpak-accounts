import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/ledger': 'All Transactions',
  '/debit': 'Debit Ledger',
  '/credit': 'Credit Ledger',
  '/projects': 'Projects',
  '/history': 'History'
}

export default function Layout() {
  const { pathname } = useLocation()
  const title = titles[pathname] ?? 'Dashboard'

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
          <span className="text-sm text-slate-500">{new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

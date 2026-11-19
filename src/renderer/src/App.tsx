import { HashRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DebitPage from './pages/Debit'
import CreditPage from './pages/Credit'
import ProjectsPage from './pages/Projects'
import HistoryPage from './pages/History'
import LedgerPage from './pages/Ledger'

export default function App() {
  return (
    <HashRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="ledger" element={<LedgerPage />} />
          <Route path="debit" element={<DebitPage />} />
          <Route path="credit" element={<CreditPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

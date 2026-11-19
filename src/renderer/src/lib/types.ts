export interface DebitEntry {
  id: string
  serialNumber: number
  date: string
  particulars: string
  amount: number
  total: number
  isHistorical: boolean
  createdAt: string
}

export interface CreditEntry {
  id: string
  serialNumber: number
  date: string
  reference: string | null
  purpose: string | null
  particulars: string
  amount: number
  total: number
  isHistorical: boolean
  createdAt: string
}

export interface ProjectEntry {
  id: string
  serialNumber: number
  projectCode: string
  subject: string
  submitDate: string
  receiveDate: string | null
  chequeNumber: number | null
  chequeDate: string | null
  bank: string
  amount: number
  receivedAmount: number
  isHistorical: boolean
  createdAt: string
}

export interface DashboardStats {
  totalDebit: number
  totalCredit: number
  totalProjectReceived: number
  balance: number
  totalProjects: number
}

export interface ChartData {
  month: string
  debit: number
  credit: number
}

export interface RecentTransaction {
  id: string
  serialNumber: number
  date: string
  particulars: string
  amount: number
  total: number
  type: 'debit' | 'credit'
}

const invoke = (channel: string, ...args: any[]) =>
  window.electron.ipcRenderer.invoke(channel, ...args)

export const ipc = {
  debit: {
    getAll: () => invoke('debit:getAll'),
    add: (data: { date: string; particulars: string; amount: number }) => invoke('debit:add', data),
    update: (id: string, data: { date?: string; particulars?: string; amount?: number }) =>
      invoke('debit:update', id, data),
    delete: (id: string) => invoke('debit:delete', id),
    archive: () => invoke('debit:archive'),
    getHistory: () => invoke('debit:getHistory')
  },
  credit: {
    getAll: () => invoke('credit:getAll'),
    add: (data: { date: string; reference?: string; purpose?: string; particulars: string; amount: number }) =>
      invoke('credit:add', data),
    update: (id: string, data: { date?: string; reference?: string; purpose?: string; particulars?: string; amount?: number }) =>
      invoke('credit:update', id, data),
    delete: (id: string) => invoke('credit:delete', id),
    archive: () => invoke('credit:archive'),
    getHistory: () => invoke('credit:getHistory')
  },
  project: {
    getAll: () => invoke('project:getAll'),
    add: (data: { projectCode: string; subject: string; submitDate: string; receiveDate?: string; chequeNumber?: number; chequeDate?: string; bank: string; amount: number }) =>
      invoke('project:add', data),
    update: (id: string, data: any) => invoke('project:update', id, data),
    delete: (id: string) => invoke('project:delete', id),
    archive: () => invoke('project:archive'),
    getHistory: () => invoke('project:getHistory')
  },
  dashboard: {
    getStats: () => invoke('dashboard:getStats'),
    getChartData: () => invoke('dashboard:getChartData'),
    getRecentTransactions: () => invoke('dashboard:getRecentTransactions')
  }
}

export function formatDate(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB')
}

export function formatAmount(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function toInputDate(iso: string): string {
  if (!iso) return ''
  return iso.split('T')[0]
}

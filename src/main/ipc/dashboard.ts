import { ipcMain } from 'electron'
import { prisma } from '../db'
import Decimal from 'decimal.js'

export function registerDashboardHandlers() {
  // Algorithm 9
  ipcMain.handle('dashboard:getStats', async () => {
    const [debits, credits, projects] = await Promise.all([
      prisma.debit.findMany({ where: { isHistorical: false } }),
      prisma.credit.findMany({ where: { isHistorical: false } }),
      prisma.project.findMany({ where: { isHistorical: false } })
    ])

    const totalDebit = debits.reduce((s, r) => s.plus(r.amount.toString()), new Decimal(0))
    const totalCredit = credits.reduce((s, r) => s.plus(r.amount.toString()), new Decimal(0))
    const totalProjectReceived = projects.reduce((s, r) => s.plus(r.receivedAmount.toString()), new Decimal(0))
    // Balance = Credit (জমা) + Project received − Debit (খরচ)
    const balance = totalCredit.plus(totalProjectReceived).minus(totalDebit)

    return {
      totalDebit: Number(totalDebit),
      totalCredit: Number(totalCredit),
      totalProjectReceived: Number(totalProjectReceived),
      balance: Number(balance),
      totalProjects: projects.length
    }
  })

  // Algorithm 7
  ipcMain.handle('dashboard:getChartData', async () => {
    const [debits, credits] = await Promise.all([
      prisma.debit.findMany({ where: { isHistorical: false } }),
      prisma.credit.findMany({ where: { isHistorical: false } })
    ])

    const map: Record<string, { debit: number; credit: number }> = {}

    for (const r of debits) {
      const month = new Date(r.date).toLocaleString('default', { month: 'short' })
      if (!map[month]) map[month] = { debit: 0, credit: 0 }
      map[month].debit += Number(r.amount)
    }
    for (const r of credits) {
      const month = new Date(r.date).toLocaleString('default', { month: 'short' })
      if (!map[month]) map[month] = { debit: 0, credit: 0 }
      map[month].credit += Number(r.amount)
    }

    return Object.entries(map).map(([month, d]) => ({ month, ...d }))
  })

  // Algorithm 11
  ipcMain.handle('dashboard:getRecentTransactions', async () => {
    const [debits, credits] = await Promise.all([
      prisma.debit.findMany({ where: { isHistorical: false }, orderBy: { serialNumber: 'asc' } }),
      prisma.credit.findMany({ where: { isHistorical: false }, orderBy: { serialNumber: 'asc' } })
    ])

    const recentDebits = [...debits].reverse().slice(0, 6).map(r => ({
      id: r.id,
      serialNumber: r.serialNumber,
      date: r.date.toISOString(),
      particulars: r.particulars,
      amount: Number(r.amount),
      total: Number(r.total),
      type: 'debit' as const
    }))

    const recentCredits = [...credits].reverse().slice(0, 6).map(r => ({
      id: r.id,
      serialNumber: r.serialNumber,
      date: r.date.toISOString(),
      particulars: r.particulars,
      amount: Number(r.amount),
      total: Number(r.total),
      type: 'credit' as const
    }))

    return { debits: recentDebits, credits: recentCredits }
  })
}

import { ipcMain } from 'electron'
import { prisma } from '../db'
import Decimal from 'decimal.js'

function serializeDebit(r: any) {
  return {
    id: r.id,
    serialNumber: r.serialNumber,
    date: r.date instanceof Date ? r.date.toISOString() : r.date,
    particulars: r.particulars,
    amount: Number(r.amount),
    total: Number(r.total),
    isHistorical: r.isHistorical,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt
  }
}

export function registerDebitHandlers() {
  ipcMain.handle('debit:getAll', async () => {
    const rows = await prisma.debit.findMany({
      where: { isHistorical: false },
      orderBy: { serialNumber: 'asc' }
    })
    return rows.map(serializeDebit)
  })

  // Algorithm 1
  ipcMain.handle('debit:add', async (_e, data: { date: string; particulars: string; amount: number }) => {
    const activeRows = await prisma.debit.findMany({
      where: { isHistorical: false },
      orderBy: { serialNumber: 'asc' }
    })
    const runningTotal = activeRows.reduce((s, r) => s.plus(r.amount.toString()), new Decimal(0))
    const newAmount = new Decimal(data.amount)
    const newTotal = runningTotal.plus(newAmount)
    const newSerial = activeRows.length > 0 ? activeRows[activeRows.length - 1].serialNumber + 1 : 1

    const created = await prisma.debit.create({
      data: {
        serialNumber: newSerial,
        date: new Date(data.date),
        particulars: data.particulars,
        amount: newAmount.toFixed(2),
        total: newTotal.toFixed(2),
        isHistorical: false
      }
    })
    return serializeDebit(created)
  })

  // Algorithm 4
  ipcMain.handle('debit:update', async (_e, id: string, updateData: { date?: string; particulars?: string; amount?: number }) => {
    const allRows = await prisma.debit.findMany({
      where: { isHistorical: false },
      orderBy: { serialNumber: 'asc' }
    })
    const idx = allRows.findIndex(r => r.id === id)
    if (idx === -1) throw new Error('Row not found')

    // Apply update in memory
    const target = { ...allRows[idx] }
    if (updateData.date !== undefined) target.date = new Date(updateData.date) as any
    if (updateData.particulars !== undefined) (target as any).particulars = updateData.particulars
    if (updateData.amount !== undefined) target.amount = new Decimal(updateData.amount) as any
    allRows[idx] = target

    let runningTotal = idx > 0 ? new Decimal(allRows[idx - 1].total.toString()) : new Decimal(0)

    const updates: any[] = []
    for (let j = idx; j < allRows.length; j++) {
      runningTotal = runningTotal.plus(allRows[j].amount.toString())
      const dbData: any = { total: runningTotal.toFixed(2) }
      if (j === idx) {
        if (updateData.date !== undefined) dbData.date = new Date(updateData.date)
        if (updateData.particulars !== undefined) dbData.particulars = updateData.particulars
        if (updateData.amount !== undefined) dbData.amount = new Decimal(updateData.amount).toFixed(2)
      }
      updates.push(prisma.debit.update({ where: { id: allRows[j].id }, data: dbData }))
    }

    await prisma.$transaction(updates)
    return { success: true }
  })

  // Algorithm 5
  ipcMain.handle('debit:delete', async (_e, id: string) => {
    const allRows = await prisma.debit.findMany({
      where: { isHistorical: false },
      orderBy: { serialNumber: 'asc' }
    })
    const idx = allRows.findIndex(r => r.id === id)
    if (idx === -1) throw new Error('Row not found')

    await prisma.debit.delete({ where: { id } })

    let runningTotal = idx > 0 ? new Decimal(allRows[idx - 1].total.toString()) : new Decimal(0)
    const updates: any[] = []
    for (let k = idx + 1; k < allRows.length; k++) {
      runningTotal = runningTotal.plus(allRows[k].amount.toString())
      updates.push(
        prisma.debit.update({
          where: { id: allRows[k].id },
          data: { serialNumber: allRows[k].serialNumber - 1, total: runningTotal.toFixed(2) }
        })
      )
    }
    if (updates.length) await prisma.$transaction(updates)
    return { success: true }
  })

  // Algorithm 6
  ipcMain.handle('debit:archive', async () => {
    const activeRows = await prisma.debit.findMany({
      where: { isHistorical: false },
      orderBy: { serialNumber: 'asc' }
    })
    const totalAmount = activeRows.reduce((s, r) => s.plus(r.amount.toString()), new Decimal(0))

    const now = new Date()
    await prisma.debit.updateMany({
      where: { isHistorical: false, date: { lt: now } },
      data: { isHistorical: true }
    })

    const allHistorical = await prisma.debit.findMany({
      where: { isHistorical: true },
      orderBy: { serialNumber: 'asc' }
    })
    if (allHistorical.length > 0) {
      await prisma.$transaction(
        allHistorical.map((row, i) => prisma.debit.update({ where: { id: row.id }, data: { serialNumber: i + 1 } }))
      )
    }

    const today = new Date()
    const summary = await prisma.debit.create({
      data: {
        serialNumber: 1,
        date: today,
        particulars: `Total Of All Debits - ${today.toLocaleDateString('en-GB')}`,
        amount: totalAmount.toFixed(2),
        total: totalAmount.toFixed(2),
        isHistorical: false
      }
    })
    return serializeDebit(summary)
  })

  ipcMain.handle('debit:getHistory', async () => {
    const rows = await prisma.debit.findMany({
      where: { isHistorical: true },
      orderBy: { serialNumber: 'asc' }
    })
    return rows.map(serializeDebit)
  })
}

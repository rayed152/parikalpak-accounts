import { ipcMain } from 'electron'
import { prisma } from '../db'
import Decimal from 'decimal.js'

function serializeCredit(r: any) {
  return {
    id: r.id,
    serialNumber: r.serialNumber,
    date: r.date instanceof Date ? r.date.toISOString() : r.date,
    reference: r.reference ?? null,
    purpose: r.purpose ?? null,
    particulars: r.particulars,
    amount: Number(r.amount),
    total: Number(r.total),
    isHistorical: r.isHistorical,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt
  }
}

export function registerCreditHandlers() {
  ipcMain.handle('credit:getAll', async () => {
    const rows = await prisma.credit.findMany({
      where: { isHistorical: false },
      orderBy: { serialNumber: 'asc' }
    })
    return rows.map(serializeCredit)
  })

  // Algorithm 1
  ipcMain.handle('credit:add', async (_e, data: { date: string; reference?: string; purpose?: string; particulars: string; amount: number }) => {
    const activeRows = await prisma.credit.findMany({
      where: { isHistorical: false },
      orderBy: { serialNumber: 'asc' }
    })
    const runningTotal = activeRows.reduce((s, r) => s.plus(r.amount.toString()), new Decimal(0))
    const newAmount = new Decimal(data.amount)
    const newTotal = runningTotal.plus(newAmount)
    const newSerial = activeRows.length > 0 ? activeRows[activeRows.length - 1].serialNumber + 1 : 1

    const created = await prisma.credit.create({
      data: {
        serialNumber: newSerial,
        date: new Date(data.date),
        reference: data.reference || null,
        purpose: data.purpose || null,
        particulars: data.particulars,
        amount: newAmount.toFixed(2),
        total: newTotal.toFixed(2),
        isHistorical: false
      }
    })
    return serializeCredit(created)
  })

  // Algorithm 4
  ipcMain.handle('credit:update', async (_e, id: string, updateData: { date?: string; reference?: string; purpose?: string; particulars?: string; amount?: number }) => {
    const allRows = await prisma.credit.findMany({
      where: { isHistorical: false },
      orderBy: { serialNumber: 'asc' }
    })
    const idx = allRows.findIndex(r => r.id === id)
    if (idx === -1) throw new Error('Row not found')

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
        if (updateData.reference !== undefined) dbData.reference = updateData.reference || null
        if (updateData.purpose !== undefined) dbData.purpose = updateData.purpose || null
        if (updateData.particulars !== undefined) dbData.particulars = updateData.particulars
        if (updateData.amount !== undefined) dbData.amount = new Decimal(updateData.amount).toFixed(2)
      }
      updates.push(prisma.credit.update({ where: { id: allRows[j].id }, data: dbData }))
    }
    await prisma.$transaction(updates)
    return { success: true }
  })

  // Algorithm 5
  ipcMain.handle('credit:delete', async (_e, id: string) => {
    const allRows = await prisma.credit.findMany({
      where: { isHistorical: false },
      orderBy: { serialNumber: 'asc' }
    })
    const idx = allRows.findIndex(r => r.id === id)
    if (idx === -1) throw new Error('Row not found')

    await prisma.credit.delete({ where: { id } })

    let runningTotal = idx > 0 ? new Decimal(allRows[idx - 1].total.toString()) : new Decimal(0)
    const updates: any[] = []
    for (let k = idx + 1; k < allRows.length; k++) {
      runningTotal = runningTotal.plus(allRows[k].amount.toString())
      updates.push(
        prisma.credit.update({
          where: { id: allRows[k].id },
          data: { serialNumber: allRows[k].serialNumber - 1, total: runningTotal.toFixed(2) }
        })
      )
    }
    if (updates.length) await prisma.$transaction(updates)
    return { success: true }
  })

  // Algorithm 6
  ipcMain.handle('credit:archive', async () => {
    const activeRows = await prisma.credit.findMany({
      where: { isHistorical: false },
      orderBy: { serialNumber: 'asc' }
    })
    const totalAmount = activeRows.reduce((s, r) => s.plus(r.amount.toString()), new Decimal(0))

    const now = new Date()
    await prisma.credit.updateMany({
      where: { isHistorical: false, date: { lt: now } },
      data: { isHistorical: true }
    })

    const allHistorical = await prisma.credit.findMany({
      where: { isHistorical: true },
      orderBy: { serialNumber: 'asc' }
    })
    if (allHistorical.length > 0) {
      await prisma.$transaction(
        allHistorical.map((row, i) => prisma.credit.update({ where: { id: row.id }, data: { serialNumber: i + 1 } }))
      )
    }

    const today = new Date()
    const summary = await prisma.credit.create({
      data: {
        serialNumber: 1,
        date: today,
        particulars: `Total Of All Credits - ${today.toLocaleDateString('en-GB')}`,
        amount: totalAmount.toFixed(2),
        total: totalAmount.toFixed(2),
        isHistorical: false
      }
    })
    return serializeCredit(summary)
  })

  ipcMain.handle('credit:getHistory', async () => {
    const rows = await prisma.credit.findMany({
      where: { isHistorical: true },
      orderBy: { serialNumber: 'asc' }
    })
    return rows.map(serializeCredit)
  })
}

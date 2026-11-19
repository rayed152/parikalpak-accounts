import { ipcMain } from 'electron'
import { prisma } from '../db'
import Decimal from 'decimal.js'

function serializeProject(r: any) {
  return {
    id: r.id,
    serialNumber: r.serialNumber,
    projectCode: r.projectCode,
    subject: r.subject,
    submitDate: r.submitDate instanceof Date ? r.submitDate.toISOString() : r.submitDate,
    receiveDate: r.receiveDate ? (r.receiveDate instanceof Date ? r.receiveDate.toISOString() : r.receiveDate) : null,
    chequeNumber: r.chequeNumber ?? null,
    chequeDate: r.chequeDate ? (r.chequeDate instanceof Date ? r.chequeDate.toISOString() : r.chequeDate) : null,
    bank: r.bank,
    amount: Number(r.amount),
    receivedAmount: Number(r.receivedAmount),
    isHistorical: r.isHistorical,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt
  }
}

export function registerProjectHandlers() {
  ipcMain.handle('project:getAll', async () => {
    const rows = await prisma.project.findMany({
      where: { isHistorical: false },
      orderBy: { serialNumber: 'asc' }
    })
    return rows.map(serializeProject)
  })

  // Algorithm 2
  ipcMain.handle('project:add', async (_e, data: {
    projectCode: string; subject: string; submitDate: string; receiveDate?: string;
    chequeNumber?: number; chequeDate?: string; bank: string; amount: number
  }) => {
    const amount = new Decimal(data.amount)
    const receivedAmount = amount.times('0.9')

    // Projects serial number spans ALL rows (historical + non-historical)
    const lastProject = await prisma.project.findFirst({ orderBy: { serialNumber: 'desc' } })
    const newSerial = lastProject ? lastProject.serialNumber + 1 : 1

    const project = await prisma.project.create({
      data: {
        serialNumber: newSerial,
        projectCode: data.projectCode,
        subject: data.subject,
        submitDate: new Date(data.submitDate),
        receiveDate: data.receiveDate ? new Date(data.receiveDate) : null,
        chequeNumber: data.chequeNumber ?? null,
        chequeDate: data.chequeDate ? new Date(data.chequeDate) : null,
        bank: data.bank,
        amount: amount.toFixed(2),
        receivedAmount: receivedAmount.toFixed(2),
        isHistorical: false
      }
    })

    return serializeProject(project)
  })

  // Update project — receivedAmount always recalculated if amount changes
  ipcMain.handle('project:update', async (_e, id: string, updateData: {
    projectCode?: string; subject?: string; submitDate?: string; receiveDate?: string;
    chequeNumber?: number | null; chequeDate?: string; bank?: string; amount?: number
  }) => {
    const updatePayload: any = {}
    if (updateData.projectCode !== undefined) updatePayload.projectCode = updateData.projectCode
    if (updateData.subject !== undefined) updatePayload.subject = updateData.subject
    if (updateData.submitDate !== undefined) updatePayload.submitDate = new Date(updateData.submitDate)
    if ('receiveDate' in updateData) updatePayload.receiveDate = updateData.receiveDate ? new Date(updateData.receiveDate) : null
    if ('chequeNumber' in updateData) updatePayload.chequeNumber = updateData.chequeNumber ?? null
    if ('chequeDate' in updateData) updatePayload.chequeDate = updateData.chequeDate ? new Date(updateData.chequeDate) : null
    if (updateData.bank !== undefined) updatePayload.bank = updateData.bank
    if (updateData.amount !== undefined) {
      const a = new Decimal(updateData.amount)
      updatePayload.amount = a.toFixed(2)
      updatePayload.receivedAmount = a.times('0.9').toFixed(2)
    }

    const updated = await prisma.project.update({ where: { id }, data: updatePayload })
    return serializeProject(updated)
  })

  // Algorithm 5 (simple delete, no cascade needed for projects)
  ipcMain.handle('project:delete', async (_e, id: string) => {
    await prisma.project.delete({ where: { id } })
    return { success: true }
  })

  // Algorithm 6 variant for projects
  ipcMain.handle('project:archive', async () => {
    await prisma.project.updateMany({
      where: { isHistorical: false },
      data: { isHistorical: true }
    })

    const allHistorical = await prisma.project.findMany({
      where: { isHistorical: true },
      orderBy: { serialNumber: 'asc' }
    })
    if (allHistorical.length > 0) {
      await prisma.$transaction(
        allHistorical.map((row, i) => prisma.project.update({ where: { id: row.id }, data: { serialNumber: i + 1 } }))
      )
    }

    const today = new Date()
    const ym = `${today.getFullYear()}-${today.getMonth() + 1}`
    const summary = await prisma.project.create({
      data: {
        serialNumber: allHistorical.length + 1,
        projectCode: `SUMMARY-${ym}`,
        subject: `Monthly Project Summary - ${today.toLocaleDateString('en-GB')}`,
        submitDate: today,
        bank: '',
        amount: '0.00',
        receivedAmount: '0.00',
        isHistorical: false
      }
    })
    return serializeProject(summary)
  })

  ipcMain.handle('project:getHistory', async () => {
    const rows = await prisma.project.findMany({
      where: { isHistorical: true },
      orderBy: { serialNumber: 'asc' }
    })
    return rows.map(serializeProject)
  })
}

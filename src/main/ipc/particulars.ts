import { ipcMain, app } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

type ParticularsType = 'debit' | 'credit' | 'project'
interface ParticularsData { debit: string[]; credit: string[]; project: string[] }

function filePath() {
  return join(app.getPath('userData'), 'particulars.json')
}

function readData(): ParticularsData {
  const p = filePath()
  if (!existsSync(p)) return { debit: [], credit: [], project: [] }
  try { return JSON.parse(readFileSync(p, 'utf-8')) }
  catch { return { debit: [], credit: [], project: [] } }
}

function writeData(data: ParticularsData) {
  writeFileSync(filePath(), JSON.stringify(data, null, 2), 'utf-8')
}

export function registerParticularsHandlers() {
  ipcMain.handle('particulars:getAll', (_e, type: ParticularsType) => {
    return readData()[type] ?? []
  })

  ipcMain.handle('particulars:add', (_e, type: ParticularsType, label: string) => {
    const data = readData()
    const list = data[type] ?? []
    const trimmed = label.trim()
    if (trimmed && !list.some(x => x.toLowerCase() === trimmed.toLowerCase())) {
      list.push(trimmed)
      data[type] = list
      writeData(data)
    }
    return data[type]
  })

  ipcMain.handle('particulars:delete', (_e, type: ParticularsType, label: string) => {
    const data = readData()
    data[type] = (data[type] ?? []).filter(x => x.toLowerCase() !== label.toLowerCase())
    writeData(data)
    return data[type]
  })
}

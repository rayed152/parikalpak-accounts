import { PrismaClient } from '@prisma/client'
import { app } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { readdirSync } from 'fs'

// Set DB path before PrismaClient is instantiated.
// app.getPath('userData') works before app.whenReady() on all platforms.
const dbPath = join(app.getPath('userData'), 'database.db')
process.env.DATABASE_URL = `file:${dbPath}`

// In a packaged app, Prisma's native .node binary sits in app.asar.unpacked
// (native modules cannot be loaded from inside the ASAR archive).
if (!is.dev) {
  try {
    const prismaDir = join(
      process.resourcesPath,
      'app.asar.unpacked',
      'node_modules',
      '.prisma',
      'client'
    )
    const engineFile = readdirSync(prismaDir).find((f) => f.endsWith('.node'))
    if (engineFile) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = join(prismaDir, engineFile)
    }
  } catch {
    // fall through — Prisma will attempt its own path resolution
  }
}

export const prisma = new PrismaClient()

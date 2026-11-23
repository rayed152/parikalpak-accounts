import { PrismaClient } from '@prisma/client'
import { app } from 'electron'
import { join } from 'path'

const dbPath = join(app.getPath('userData'), 'database.db')
process.env.DATABASE_URL = `file:${dbPath}`

export const prisma = new PrismaClient()

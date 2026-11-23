import { prisma } from './db'

// Creates all tables if they don't already exist.
// Runs on every startup — safe to call repeatedly (IF NOT EXISTS).
export async function runMigrations(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Debit" (
      "id"           TEXT    NOT NULL PRIMARY KEY,
      "serialNumber" INTEGER NOT NULL,
      "date"         DATETIME NOT NULL,
      "particulars"  TEXT    NOT NULL,
      "amount"       DECIMAL NOT NULL,
      "total"        DECIMAL NOT NULL,
      "isHistorical" INTEGER NOT NULL DEFAULT 0,
      "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Credit" (
      "id"           TEXT    NOT NULL PRIMARY KEY,
      "serialNumber" INTEGER NOT NULL,
      "date"         DATETIME NOT NULL,
      "reference"    TEXT,
      "purpose"      TEXT,
      "particulars"  TEXT    NOT NULL,
      "amount"       DECIMAL NOT NULL,
      "total"        DECIMAL NOT NULL,
      "isHistorical" INTEGER NOT NULL DEFAULT 0,
      "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Project" (
      "id"             TEXT    NOT NULL PRIMARY KEY,
      "serialNumber"   INTEGER NOT NULL,
      "projectCode"    TEXT    NOT NULL,
      "subject"        TEXT    NOT NULL,
      "submitDate"     DATETIME NOT NULL,
      "receiveDate"    DATETIME,
      "chequeNumber"   INTEGER,
      "chequeDate"     DATETIME,
      "bank"           TEXT    NOT NULL,
      "amount"         DECIMAL NOT NULL,
      "receivedAmount" DECIMAL NOT NULL,
      "isHistorical"   INTEGER NOT NULL DEFAULT 0,
      "createdAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

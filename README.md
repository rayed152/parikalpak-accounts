# P-Dashboard — Accounts Management Desktop App

Electron + React + Prisma (Neon PostgreSQL) accounts dashboard.

## Setup

### 1. Create `.env` file

Copy `.env.example` to `.env` and fill in your Neon database URL:

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

Get this from: https://console.neon.tech → Your project → Connection Details → Connection string

### 2. Install dependencies

```bash
npm install
```

### 3. Set up database

```bash
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to Neon (creates tables)
```

### 4. Run the app

```bash
npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start in development mode |
| `npm run build` | Build for production |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:push` | Sync schema to database |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:studio` | Open Prisma Studio (browser DB viewer) |

## Features

- **Dashboard** — Stats (debit/credit/balance/projects), bar chart, pie chart, recent transactions
- **Debit Ledger** — Add/edit/delete debit entries with running cumulative totals
- **Credit Ledger** — Add/edit/delete credit entries with optional reference/purpose fields
- **Projects** — Add projects (auto-creates debit entry at 90% of amount), edit/delete
- **History** — View archived records with year/month filter, search, and column sorting
- **Archive Month** — Close the current period and start fresh with a summary carry-forward entry

## Algorithms implemented

1. Running cumulative total on every add
2. Project add with auto-debit (90% receivedAmount)
3. Balance = totalDebit − totalCredit
4. Update with cascade recalculation of all subsequent totals
5. Delete with cascade recalculation and serial resequencing
6. Month-end archival with summary carry-forward
7. Monthly bar chart data aggregation
8. History filtering by year/month/search with sortable columns
9. Dashboard stats aggregation
10. Pie chart (transaction breakdown) + bar chart (monthly)
11. Recent transactions (last 6 debits and credits)

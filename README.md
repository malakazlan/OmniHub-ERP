<p align="center">
  <img src="public/omnihub-mark.svg" width="64" alt="Omni Hub" />
</p>

<h1 align="center">Omni Hub</h1>

<p align="center">
  Operations &amp; finance platform for multi-location wholesale distributors.<br/>
  Customers, vendors, inventory, orders, invoicing, payments, a double-entry ledger, fleet, payroll and reporting in one system.
</p>

<p align="center">
  <a href="#getting-started">Getting started</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#deployment">Deployment</a> ·
  <a href="#quality">Quality</a> ·
  <a href="#security">Security</a>
</p>

<p align="center">
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white" />
  <img alt="React 19" src="https://img.shields.io/badge/React-19-20232a?logo=react&logoColor=61dafb" />
  <img alt="Prisma 7" src="https://img.shields.io/badge/Prisma-7-2d3748?logo=prisma&logoColor=white" />
  <img alt="MySQL 8" src="https://img.shields.io/badge/MySQL-8-4479a1?logo=mysql&logoColor=white" />
  <img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ed?logo=docker&logoColor=white" />
</p>

---

## Overview

Omni Hub replaces the spreadsheet-and-accounting-package workflow of a growing distributor with one operational system of record. Every sale, purchase, payment and payroll run posts to the general ledger automatically, so finance always matches operations.

<p align="center">
  <img src="docs/screenshots/dashboard.jpg" alt="Omni Hub dashboard" width="900" />
</p>

<p align="center">
  <img src="docs/screenshots/invoices.jpg" alt="Invoice register" width="900" />
</p>

## Modules

| Area | What it covers |
|---|---|
| **Sales** | Customers, sales orders with approval workflow, invoices, returns, bill corrections, invoice PDF and print |
| **Purchasing** | Vendors, purchase orders and bills, receiving into stock, returns, freight settlement, vendor activity analytics |
| **Inventory** | Items with categories, units and cost, live stock levels, stock movement audit trail, low-stock alerts, valuation report |
| **Finance** | Chart of accounts, general ledger with running balances, payments with FIFO bill settlement, expenses, journal entries, transfers, owner draws, daily close |
| **Logistics** | Fleet register, deliveries with route and freight charges, driver payments, vehicle expenses |
| **People** | Employees, attendance, payroll with advances and commissions, pay stubs, employee portal |
| **Reporting** | Invoice, purchasing, inventory, profit &amp; loss, receivables &amp; payables, cash and bank, payment, payroll and delivery reports, all printable and exportable |
| **Administration** | Users and roles with per-module access, company profile, activity log |

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  Browser · React 19 client components · Tailwind v4 design tokens  │
└────────────────────────────────┬───────────────────────────────────┘
                                 │  fetch /api/*
┌────────────────────────────────▼───────────────────────────────────┐
│  Next.js 16 App Router                                             │
│  ├─ src/proxy.js       session gate for pages                      │
│  ├─ src/app/api/**     95 route handlers, auth re-validated        │
│  └─ src/lib/**         domain logic: ledger, numbering, payroll    │
└────────────────────────────────┬───────────────────────────────────┘
                                 │  Prisma 7 + MariaDB driver adapter
┌────────────────────────────────▼───────────────────────────────────┐
│  MySQL 8 / TiDB · 38 tables · versioned migrations                 │
└────────────────────────────────────────────────────────────────────┘
```

**Design principles**

- **The ledger is the source of truth.** Sales, purchases, payments, expenses, payroll and transfers post `LedgerEntry` rows inside the same transaction as the document. Journals, transfers and draws are validated as balanced before posting. Account totals are persisted; running balances are derived on read.
- **Concurrency-safe numbering.** Invoice, purchase order, payment and SKU numbers are reserved from a `document_sequences` table under a row lock, so two users saving at the same moment can never receive the same number.
- **Sessions are re-validated.** Every API call verifies the signed cookie and reloads role, module access and active flag from the database, so deactivating a user takes effect immediately.
- **Transient failures retry.** Dropped connections, lock-wait timeouts and deadlocks are retried with back-off instead of surfacing as errors.
- **One design system.** Colour, type and spacing are tokens in `src/app/globals.css`; light and dark themes come from the same tokens.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16, React 19 | One codebase for UI and API, server routing, production build tooling |
| Language | JavaScript (ES2023) | Matches the codebase; typed data access through Prisma |
| Data | Prisma 7, MySQL 8 (or TiDB) | Transactional integrity for accounting data, migrations, broad hosting support |
| Styling | Tailwind CSS v4 with CSS tokens | Consistent, themeable, fast to extend |
| Auth | HS256 session cookie, bcrypt | Stateless sessions with server-side authorization |
| Documents | jsPDF, html2canvas, react-to-print | Invoices, bills, receipts, ledgers and pay stubs as PDF or print |
| Charts | Recharts | Dashboard and report visualisations |

## Getting started

**Requirements:** Node.js 22+ and MySQL 8 (local or hosted).

```bash
git clone https://github.com/malakazlan/OmniHub-ERP.git
cd OmniHub-ERP
npm install
cp .env.example .env     # fill in DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run db:check         # verifies the connection; TLS is enabled automatically for non-local hosts
npm run db:setup         # prisma generate + migrate deploy + seed
npm run dev              # http://localhost:3000
```

Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. The seed never overwrites an existing administrator's password.

Optional demo dataset, posted through the real API so stock, ledger and numbering are produced by production code:

```bash
node scripts/demo-data.mjs
```

### Configuration

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | `mysql://user:pass@host:3306/omnihub`. Append `?sslaccept=strict` for TLS-only hosts or `?ssl=false` for a plain local server. TLS defaults to on for any non-local host. |
| `JWT_SECRET` | yes | 32+ random characters used to sign sessions. The app refuses to issue sessions without it. |
| `ADMIN_EMAIL` | seed only | First administrator login. |
| `ADMIN_PASSWORD` | seed only | First administrator password, 10+ characters. |

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `npm run build` / `npm start` | Development server, production build, production server |
| `npm run lint` | ESLint |
| `npm run db:check` | Connection test with TLS detection |
| `npm run db:migrate` | Apply pending migrations (`prisma migrate deploy`) |
| `npm run db:seed` | Create the administrator, default ledger accounts, item categories and cities |
| `npm run db:setup` | Generate client, migrate and seed in one step |
| `npm run smoke` | End-to-end functional test of every business flow through the API |
| `npm run reconcile` | Verify account balances against ledger sums and payment statuses against paid totals (`--fix` repairs) |
| `node scripts/demo-data.mjs` | Load the demo dataset; re-runnable, resumes per phase |
| `node scripts/purge-tagged.mjs <TAG>` | Remove every record a smoke run created |

## Project structure

```
prisma/
  schema.prisma          data model (38 tables)
  migrations/            versioned SQL applied by prisma migrate deploy
  seed.mjs               idempotent administrator and defaults
scripts/                 operational tooling: db-check, demo-data, smoke, reconcile, purge-tagged
src/
  proxy.js               page-level session gate (Next.js 16 proxy convention)
  app/
    (dashboard)/         application pages, one folder per module
    api/                 route handlers, one folder per resource
    globals.css          design tokens, theme, shared component styles
  components/            UI primitives, layout shell, module components, printable documents
  lib/                   domain logic: ledger, numbering, order processing, payroll, settlements
design/                  approved UI specification (static preview)
docs/                    screenshots
Dockerfile, docker-entrypoint.sh
```

## Deployment

### Self-hosted with Coolify (recommended)

The repository ships a production `Dockerfile`. On start, `docker-entrypoint.sh` waits for the database, applies migrations, seeds the administrator if `ADMIN_EMAIL` / `ADMIN_PASSWORD` are set, and starts Next.js on port 3000 with a health check on `/api/health`.

1. **Database:** add a *MySQL 8* resource in Coolify and copy its internal connection string.
2. **Application:** add a resource from this repository with build pack **Dockerfile**, port **3000**, health check `/api/health`, and attach your domain. Coolify issues the certificate.
3. **Environment variables:**

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `mysql://user:password@<mysql-host>:3306/omnihub?ssl=false` on the internal network, or `?sslaccept=strict` for an external TLS database |
   | `JWT_SECRET` | output of `openssl rand -base64 48` |
   | `ADMIN_EMAIL` | first administrator login |
   | `ADMIN_PASSWORD` | first administrator password |

4. **Deploy.** The log shows `Applying migrations...` and then `Starting Omni Hub`. Enable the database backup schedule in Coolify.

Schema changes ship as files under `prisma/migrations/` and are applied automatically on the next deploy.

### Vercel

Import the repository, set the four variables above, run `npm run db:migrate` and `npm run db:seed` once against the production database, then deploy. Transaction-heavy routes declare `maxDuration` for serverless hosts.

## Quality

Release checklist, all passing on `main`:

1. `npm run lint` and `npm run build`.
2. `npm run smoke` against a running server: 47 business flows and 78 read endpoints, covering stock and ledger effects of purchases, invoices, FIFO settlement, returns, corrections, payroll, deliveries, order conversion, daily close and role enforcement. Purge the run's tag afterwards.
3. `npm run reconcile` reports no mismatches.
4. Every page reviewed at desktop width against `design/omnihub-preview.html`. Shared layout rules live in the override layer at the end of `src/app/globals.css`, so a placement fix is made once, not per page.

## Security

- No public registration. Administrators create logins and assign module access.
- Sessions: HTTP-only, SameSite cookies, 12-hour lifetime, secret required, re-validated against the database on every request.
- Login throttling after repeated failures; constant-time password comparison for unknown emails.
- Role checks on every mutating route; deletes are administrator-only; employees with payroll history are deactivated rather than deleted.
- Secrets live only in environment variables. `.env` is git-ignored; `.env.example` documents the keys.

## Roadmap

- TypeScript migration
- Multi-warehouse stock with transfers
- Sales tax tables by state
- Bank statement import and reconciliation

## License

Proprietary. All rights reserved.

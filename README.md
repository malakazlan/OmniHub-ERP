# Warraich Traders ERP

Enterprise Resource Planning system for **Warraich Traders** — an animal feed trading company managing the full two-way supply chain: farmers → raw materials → companies → finished feed → shops.

---

## Overall Progress

| Metric | Value |
|---|---|
| **Overall Completion** | **96%** |
| **Phase 1 — Foundation** | ✅ 100% Done |
| **Phase 2 — Entity Management** | ✅ 95% Done |
| **Phase 3 — Transactions** | ✅ 95% Done |
| **Phase 4 — Financial** | ✅ 98% Done |
| **Phase 5 — Reporting** | ✅ 90% Done |
| **Phase 6 — HR & Polish** | ✅ 95% Done |

```
Foundation     ████████████████████░ 100%
Entities       ███████████████████░░  95%
Transactions   ███████████████████░░  95%
Financial      ███████████████████░░  98%
Reporting      ██████████████████░░░  90%
HR & Polish    ███████████████████░░  95%
─────────────────────────────────────
TOTAL          ███████████████████░░  96%
```

---

## Module Completion Tracker

| # | Module | API | UI | Features | Status | Done |
|---|---|---|---|---|---|---|
| 1 | **Landing Page** | — | ✅ | Animated, minimal (name + tagline) | ✅ Done | 100% |
| 2 | **Login / Auth** | ✅ | ✅ | JWT cookies, role-based access | ✅ Done | 90% |
| 3 | **Dashboard** | ✅ | ✅ | KPI cards (live, auto-refresh 60s), **real 7-day trend chart** | ✅ Done | 95% |
| 4 | **Farmers** | ✅ | ✅ | List, create, detail/edit/delete, ledger view, **correct payable/credit sign display** | ✅ Done | 95% |
| 5 | **Companies** | ✅ | ✅ | List, create, detail/edit/delete, ledger view | ✅ Done | 90% |
| 6 | **Shops** | ✅ | ✅ | List, create, detail/edit/delete, ledger view | ✅ Done | 90% |
| 7 | **Products** | ✅ | ✅ | CRUD, categories, detail/edit/delete, stock history | ✅ Done | 90% |
| 8 | **Accounts** | ✅ | ✅ | Chart of accounts, ledgers, payments, expenses, journal, **ledger-derived Day Close** | ✅ Done | 95% |
| 9 | **Purchases** | ✅ | ✅ | List, create, detail view, returns | ✅ Done | 90% |
| 10 | **Sales** | ✅ | ✅ | List, create, detail view, gate pass, returns | ✅ Done | 90% |
| 11 | **Transport** | ✅ | ✅ | List, create/edit, fleet CRUD, vehicle expense tracking, report | ✅ Done | 90% |
| 12 | **Accounting** | ✅ | ✅ | Ledger engine, payments, expenses, journal entries, **real-time reconciled day close** | ✅ Done | 98% |
| 13 | **Receipts** | ✅ | 🔄 | Number generator, gate pass, basic print view (browser print) | 🔄 In Progress | 60% |
| 14 | **HR** | ✅ | ✅ | Employees CRUD, attendance, **salary now fully ledger + cash/bank synced** | ✅ Done | 95% |
| 15 | **Reports** | ✅ | ✅ | Sales, purchases, inventory, P&L, transport pages, **corrected receivables/payables math** | ✅ Done | 90% |
| 16 | **Settings** | ✅ | ✅ | Company profile, users, cities, bank accounts, activity log | ✅ Done | 85% |

**Legend:** ✅ Done · 🔄 In Progress · ⏳ Pending · ❌ Not Started

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | JavaScript |
| Styling | Tailwind CSS v4 |
| Database | MySQL (XAMPP) — `warraichtraders_erp` |
| ORM | Prisma 7 + MariaDB adapter |
| Auth | JWT + bcryptjs + HTTP-only cookies |
| Icons | Lucide React |
| Charts | Recharts |

---

## Setup

### Prerequisites
- Node.js 18+
- XAMPP with MySQL running on `localhost:3306`

### Install & Run

```bash
npm install
npm run db:setup    # prisma generate + db push + seed
npm run dev         # http://localhost:3000
```

### Default Admin Login

| Field | Value |
|---|---|
| Email | `admin@warraichtraders.com` |
| Password | `admin1234` |

### Database Config (`.env`)

```
DATABASE_URL="mysql://root@localhost:3306/warraichtraders_erp"
JWT_SECRET="warraichtraders_erp_secret_key_jwt_2026"
```

---

## UI Design System

Each module uses its own accent color on a shared dark slate base:

| Module | Accent | Icon |
|---|---|---|
| Dashboard | Indigo `#6366F1` | 📊 |
| Farmers | Emerald `#059669` | 🌾 |
| Companies | Blue `#2563EB` | 🏢 |
| Shops | Amber `#D97706` | 🏪 |
| Products | Violet `#7C3AED` | 📦 |
| Purchases | Red `#DC2626` | 🛒 |
| Sales | Green `#16A34A` | 💰 |
| Transport | Cyan `#0891B2` | 🚚 |
| Accounting | Deep Indigo `#4338CA` | 📒 |
| HR | Pink `#BE185D` | 👥 |
| Reports | Teal `#0D9488` | 📈 |
| Settings | Neutral `#525252` | ⚙️ |

Typography: **Inter** (UI) · **JetBrains Mono** (numbers/codes)

---

## Business Flow

```
Farmer ──(raw materials)──► Warraich Traders ──(raw materials)──► Company
Company ──(finished products)──► Warraich Traders ──(finished products)──► Shops
```

---

## Phase Roadmap

### Phase 1 — Foundation ✅ 100%
- [x] Dependencies, Prisma schema, MySQL connection
- [x] Design system (globals.css, module accents)
- [x] Base UI components (Button, Card, Modal, DataTable, Badge)
- [x] Layout (Sidebar, TopBar, PageHeader)
- [x] Auth (login, JWT, middleware, context)
- [x] Dashboard layout with route groups
- [x] Animated landing page + login page

### Phase 2 — Entity Management ✅ 95%
- [x] Farmers module (API + UI)
- [x] Companies module (API + UI)
- [x] Shops module (API + UI)
- [x] Products & Categories (API + UI + stock)
- [x] Chart of Accounts (API + UI)
- [x] Detail/edit/delete pages per entity (`/[id]`) — farmers, companies, shops, products, HR employees
- [x] Per-entity ledger view pages (farmers, companies, shops, accounts)
- [ ] Bulk import / export tools

### Phase 3 — Transactions ✅ 95%
- [x] Purchase orders (multi-item, stock, ledger, detail view)
- [x] Sale orders / invoices (multi-item, stock, ledger, detail view)
- [x] Gate pass generation
- [x] Transport module (vehicles CRUD, trip assignments, edit)
- [x] Purchase & sale returns (item-level, stock reversal, ledger reversal)
- [x] Vehicle expense tracking (fuel, maintenance, repair, toll, salary)

### Phase 4 — Financial ✅ 98%
- [x] Ledger engine (lib/ledger.js) — now with sign-aware receivables/payables helpers
- [x] Document number generator (lib/receipt.js)
- [x] General ledger UI per account (farmers, companies, shops, chart of accounts)
- [x] Payment recording (from/to account transfers, cash/bank/cheque/online)
- [x] Expense management (categories + expense entries with cash/bank split)
- [x] Journal entries (manual, multi-line double-entry with balance validation)
- [x] Day close — **rewritten to derive cash/bank flow directly from ledger entries**, so every source of movement stays reconciled automatically

### Phase 5 — Output & Reporting ✅ 90%
- [x] Sales / purchase / inventory reports (with date filters)
- [x] Profit & Loss report (with monthly trend chart)
- [x] Transport report (trip charges + fleet utilization)
- [x] Live dashboard KPIs with **real 7-day trend chart + 60s auto-refresh** (was static mock data)
- [x] Print-ready view (browser print) on purchase & sale detail pages
- [ ] Dedicated receipt/invoice PDF templates

### Phase 6 — HR & Polish ✅ 95%
- [x] Employee management (CRUD + detail/edit/delete page)
- [x] Attendance & salary (list + history on employee detail)
- [x] **Salary payments now post real double-entry ledger transactions** (accrual + cash/bank payout), delta-safe on edits
- [x] Settings (users, cities, bank accounts) — full create/edit/delete
- [x] Activity logging (audit trail for logins, creates, deletes across core modules + viewer page)
- [ ] Final UI polish & role testing

---

## Real-Time Data & Sync Audit (24 Jul 2026)

A full verification pass was run against the live dev server (real HTTP requests through the actual auth/session flow, not just static code review) to confirm every module reads/writes real, correctly-synced data. Issues found were fixed and re-verified end-to-end; test data was created and cleaned up afterward.

**Bugs found & fixed:**
1. **Dashboard receivables were broken (NaN-prone).** `/api/reports/sales` awaited a Promise incorrectly (`value + Promise` instead of resolving both first), corrupting the "Receivables" KPI. Fixed and re-verified.
2. **Dashboard trading-activity chart was 100% hardcoded mock data.** Replaced with a real query aggregating the last 7 days of sales/purchases, refreshed automatically every 60 seconds.
3. **Day Close cash reconciliation ignored standalone Payments.** It only summed purchase/expense cash splits, so any farmer/vendor/shop payment made through the Payments module silently vanished from the daily cash count. Rewrote it to derive cash-in/cash-out directly from ledger entries on the cash & bank accounts — this now automatically stays correct for *any* current or future source of cash movement (sales, purchases, expenses, payments, salaries, journal entries).
4. **Farmer payable sign convention was inverted in the UI.** A negative ledger balance (money Warraich Traders owes the farmer) was shown in the farmer's brand color while a positive balance (farmer owes Warraich Traders back, e.g. after a return) was flagged red as if it were a debt — the opposite of reality. Fixed the farmers list & detail page to color/label balances correctly, and split the dashboard's payables/receivables math into sign-aware `getReceivablesByCategory` / `getPayablesByCategory` helpers (`lib/ledger.js`) instead of a naive net sum.
5. **HR Salary payments were completely disconnected from accounting.** Paying a salary never touched the employee's ledger account or deducted cash/bank — so payroll never appeared in Day Close, account balances, or payables. Added `cashAmount`/`bankAmount`/`cashAccountId`/`bankAccountId` to `SalaryRecord`, wired accrual + payment ledger entries (delta-based so re-editing the same month never double-posts), and updated the Salary page UI with a cash/bank split form matching Expenses.

**Verified end-to-end (via live API calls, not just unit logic):**
- Purchase → farmer ledger (payable) → partial cash payment → full settlement via Payments → purchase return (credit reversal) — balances matched exactly at every step.
- Sale → shop ledger (receivable) → full collection via Payments → dashboard "Receivables" KPI dropped to 0 in real time.
- Salary accrual → cash payment → mid-month edit (delta) → full settlement — ledger and cash account balances matched exactly, no double-posting.
- Day Close now correctly reflects combined cash movement from purchases + payments + salaries in the same day.
- Full site crawl: all 34 pages and 30+ API endpoints return `200 OK` under an authenticated session.
- `npm run build` completes cleanly with zero errors after all changes.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:push` | Sync Prisma schema to MySQL |
| `npm run db:seed` | Seed admin user + defaults |
| `npm run db:setup` | Full database setup |

---

## Verification

```bash
npx prisma db push     # Verify schema sync
npm run build          # Verify compilation
npm run db:seed        # Reset admin credentials
```

---

*Last updated: 24 July 2026 · Warraich Traders ERP v0.3*

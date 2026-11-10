# Omni Hub

Operations and finance platform for multi-location wholesale distributors. One system for customers and vendors, items and stock, sales orders and invoices, purchase orders and bills, payments, a double-entry general ledger, fleet and deliveries, payroll, and reporting.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, JavaScript |
| Styling | Tailwind CSS v4 with a token-based design system (`src/app/globals.css`) |
| Database | MySQL-compatible (TiDB Cloud in production, MySQL 8 locally) |
| ORM | Prisma 7 with the MariaDB driver adapter |
| Auth | Signed HTTP-only session cookie (HS256), server-side re-validation on every API request |
| Documents | Print-ready invoices, bills, receipts, ledgers; PDF and CSV export |

## Local setup

Requirements: Node.js 22+, and either a local MySQL 8 server or a hosted MySQL-compatible database.

```bash
npm install
cp .env.example .env        # then fill in DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run db:check            # verifies the connection (TLS is on automatically for non-local hosts)
npm run db:setup            # prisma generate + db push + seed
npm run dev                 # http://localhost:3000
```

Sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env`. The seed never overwrites an existing admin's password.

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `mysql://user:pass@host:port/db`. Append `?sslaccept=strict` for TLS-only hosts; `?ssl=false` for a plain local server. |
| `JWT_SECRET` | 32+ random bytes used to sign sessions. The app refuses to start sessions without it. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Used only by the seed to create the first administrator. |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run db:check` | Connection test with TLS detection |
| `npm run db:push` | Sync the Prisma schema to the database |
| `npm run db:seed` | Create the admin user, default ledger accounts, item categories and cities |
| `npm run db:setup` | All of the above in order |

## Architecture notes

- **Sessions.** `src/proxy.js` gates pages on a valid cookie. API routes call `getUserFromRequest`, which verifies the token and reloads role, module access and active flag from the database, so deactivating a user takes effect immediately.
- **Ledger.** `src/lib/ledger.js` posts `LedgerEntry` rows and recomputes running balances inside the same transaction. Journals, transfers, draws and contributions are validated as balanced before posting.
- **Document numbers.** `src/lib/receipt.js` reserves numbers from the `document_sequences` table under a row lock, so two users saving at once can never receive the same invoice number.
- **Database access.** `src/lib/prisma.js` lazily creates the client, retries transient connection drops, and uses long interactive-transaction timeouts for stock and ledger flows.

## Deployment

The app runs on any Node.js host. For Vercel: import the repository, set the three environment variables above, run `npx prisma db push` and `npm run db:seed` against the production `DATABASE_URL` once from your machine, then deploy.

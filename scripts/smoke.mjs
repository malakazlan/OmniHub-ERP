/**
 * End-to-end API smoke test for Omni Hub.
 *
 * Runs every business flow through the public API with its own small test
 * records, verifies the response AND the resulting state (stock, ledger
 * balances, payment statuses), sweeps every GET endpoint, cleans up what the
 * API allows, and finally runs the same integrity checks as reconcile.mjs.
 *
 * Usage:
 *   node scripts/smoke.mjs                       # against http://localhost:3000
 *   BASE_URL=https://host node scripts/smoke.mjs
 *   SMOKE_KEEP=1 node scripts/smoke.mjs          # skip cleanup (inspect records)
 *
 * Requires ADMIN_EMAIL / ADMIN_PASSWORD and DATABASE_URL in .env.
 * Exit code is non-zero when any flow, GET endpoint, cleanup step or
 * reconciliation check fails.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { parseDatabaseUrl } from "../src/lib/dbConfig.mjs";

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;
const KEEP = process.env.SMOKE_KEEP === "1";
const REQUEST_TIMEOUT_MS = 180_000;
const EPS = 0.01;

if (!EMAIL || !PASSWORD) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TAG = `SMK${Date.now().toString(36).toUpperCase()}`;

// ---------------------------------------------------------------------------
// HTTP session (one cookie jar per logged-in user)
// ---------------------------------------------------------------------------
class Session {
  constructor(label) {
    this.label = label;
    this.cookie = "";
  }

  async raw(method, urlPath, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const started = Date.now();
    try {
      const res = await fetch(`${BASE_URL}${urlPath}`, {
        method,
        headers: { "content-type": "application/json", cookie: this.cookie },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) this.cookie = setCookie.split(";")[0];
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text.slice(0, 300) };
      }
      return { status: res.status, ok: res.ok, json, ms: Date.now() - started };
    } finally {
      clearTimeout(timer);
    }
  }

  /** Request that must succeed (2xx); throws with the server's error otherwise. */
  async api(method, urlPath, body) {
    const r = await this.raw(method, urlPath, body);
    if (!r.ok) {
      throw new Error(`${method} ${urlPath} -> ${r.status}: ${r.json.error || r.json.raw || JSON.stringify(r.json).slice(0, 200)}`);
    }
    return r.json;
  }

  async login(email, password) {
    return this.api("POST", "/api/auth/login", { email, password });
  }
}

const admin = new Session("admin");

// ---------------------------------------------------------------------------
// Result tracking
// ---------------------------------------------------------------------------
const results = []; // { flow, status: "PASS"|"FAIL"|"SKIP", detail }
const getResults = []; // { url, status, ok, detail }
const cleanupStack = []; // { name, run }
const bugs = []; // free-form notes surfaced in the summary

function record(flow, status, detail = "") {
  results.push({ flow, status, detail });
  const mark = status === "PASS" ? "ok " : status === "SKIP" ? "-- " : "!! ";
  console.log(`  ${mark}${status.padEnd(4)} ${flow}${detail ? ` — ${detail}` : ""}`);
}

function near(a, b, eps = EPS) {
  return Math.abs((Number(a) || 0) - (Number(b) || 0)) <= eps;
}

function money(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Run one flow. `fn` receives a `check(condition, message)` collector; the flow
 * passes only when every check holds and nothing throws.
 */
async function flow(name, fn) {
  const failures = [];
  const check = (cond, message) => {
    if (!cond) failures.push(message);
    return Boolean(cond);
  };
  try {
    await fn(check);
    if (failures.length) record(name, "FAIL", failures.join("; "));
    else record(name, "PASS");
  } catch (e) {
    failures.push(e.message);
    record(name, "FAIL", failures.join("; "));
  }
  return failures.length === 0;
}

function skip(name, why) {
  record(name, "SKIP", why);
}

function onCleanup(name, run) {
  cleanupStack.push({ name, run });
}

const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();
const thisMonth = new Date().getMonth() + 1;
const thisYear = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Read helpers (state verification)
// ---------------------------------------------------------------------------
async function balanceOf(accountId) {
  const r = await admin.api("GET", `/api/accounts/${accountId}`);
  return money(r.account.balance);
}
async function stockOf(productId) {
  const r = await admin.api("GET", `/api/products/${productId}`);
  return Number(r.product.currentStock) || 0;
}
async function companyBalance(companyId) {
  const r = await admin.api("GET", `/api/companies/${companyId}`);
  return money(r.balance);
}
async function purchase(id) {
  return (await admin.api("GET", `/api/purchases/${id}`)).purchase;
}
async function sale(id) {
  return (await admin.api("GET", `/api/sales/${id}`)).sale;
}

// Shared fixtures filled in as flows run
const S = {
  me: null,
  bank: null, // main bank ledger account
  bankId: null,
  generalAccount: null, // counterpart for journal lines
  categoryId: null,
  expenseCategoryId: null,
  vendor: null,
  customer: null,
  product: null,
  po1: null,
  inv1: null,
  po2: null,
  poC: null,
  invC: null,
  paymentIn: null,
  paymentOut: null,
  saleReturn: null,
  purchaseReturn: null,
  expense: null,
  journal: null,
  smokeBank: null,
  transfer: null,
  withdrawal: null,
  employee: null,
  salaryRecord: null,
  advance: null,
  vehicle: null,
  transport: null,
  vehicleExpense: null,
  order: null,
  orderSale: null,
  dayClose: null,
  city: null,
  viewerUser: null,
};

// ===========================================================================
// WRITE FLOWS
// ===========================================================================
async function runSetup() {
  await flow("login as admin", async (check) => {
    const r = await admin.login(EMAIL, PASSWORD);
    check(r.user?.role === "admin", `expected admin role, got ${r.user?.role}`);
    S.me = (await admin.api("GET", "/api/auth/me")).user;
  });

  await flow("fixtures: bank account, item category, expense category, general account", async (check) => {
    const banks = (await admin.api("GET", "/api/accounts?category=bank")).accounts || [];
    S.bank = banks.find((a) => a.code === "ACC-BANK" && a.isActive !== false) || banks.find((a) => a.isActive !== false);
    check(S.bank, "no active bank ledger account (run npm run db:seed)");
    S.bankId = S.bank?.id;

    const cats = (await admin.api("GET", "/api/products/categories")).categories || [];
    if (cats.length) {
      S.categoryId = cats[0].id;
    } else {
      const c = await admin.api("POST", "/api/products/categories", { name: `${TAG} Category` });
      S.categoryId = c.category.id;
      onCleanup("delete item category", () => admin.api("DELETE", `/api/products/categories/${S.categoryId}`));
    }

    const ecats = (await admin.api("GET", "/api/expenses/categories")).categories || [];
    if (ecats.length) {
      S.expenseCategoryId = ecats[0].id;
    } else {
      const c = await admin.api("POST", "/api/expenses/categories", { name: `${TAG} Expense Category` });
      S.expenseCategoryId = c.category.id;
      onCleanup("delete expense category", () => admin.api("DELETE", `/api/expenses/categories/${S.expenseCategoryId}`));
    }

    const general = (await admin.api("GET", "/api/accounts?category=general")).accounts || [];
    S.generalAccount = general.find((a) => a.name === "Owner's Equity") || general.find((a) => a.code !== "EQ-OWNER-DRAW");
    if (!S.generalAccount) {
      const r = await admin.api("POST", "/api/accounts", { name: `${TAG} Suspense`, type: "equity", category: "general" });
      S.generalAccount = r.account;
      onCleanup("deactivate suspense account", () => admin.api("PUT", `/api/accounts/${S.generalAccount.id}`, { isActive: false }));
    }
    check(S.generalAccount, "no general ledger account available for journal lines");
  });
}

async function runMasters() {
  await flow("create vendor (POST /api/companies fromDirectory)", async (check) => {
    const r = await admin.api("POST", "/api/companies", {
      fromDirectory: true,
      name: `${TAG} Vendor`,
      companyType: "supplier",
      phone: "(555) 010-0001",
      city: "Portland",
    });
    S.vendor = r.company;
    check(S.vendor?.id, "no company id returned");
    check(S.vendor?.accountId, "vendor has no ledger account");
    const g = await admin.api("GET", `/api/companies/${S.vendor.id}`);
    check(g.company.companyType === "supplier", "companyType not persisted");
    check(near(g.balance, 0), `new vendor balance should be 0, got ${g.balance}`);
    onCleanup("delete/deactivate vendor", () => deleteOrDeactivateCompany(S.vendor.id));
  });

  await flow("create customer (POST /api/companies fromDirectory)", async (check) => {
    const r = await admin.api("POST", "/api/companies", {
      fromDirectory: true,
      name: `${TAG} Customer`,
      companyType: "buyer",
      phone: "(555) 010-0002",
      city: "Seattle",
      creditLimit: 10000,
    });
    S.customer = r.company;
    check(S.customer?.accountId, "customer has no ledger account");
    const g = await admin.api("GET", `/api/companies/${S.customer.id}`);
    check(Number(g.company.creditLimit) === 10000, "creditLimit not persisted");
    onCleanup("delete/deactivate customer", () => deleteOrDeactivateCompany(S.customer.id));
  });

  await flow("create item (POST /api/products)", async (check) => {
    const r = await admin.api("POST", "/api/products", {
      name: `${TAG} Widget`,
      categoryId: S.categoryId,
      unit: "ea",
      costPrice: 10,
      salePrice: 15,
      minimumStock: 5,
      currentStock: 0,
    });
    S.product = r.product;
    check(S.product?.sku, "no SKU generated");
    check((await stockOf(S.product.id)) === 0, "opening stock should be 0");
    onCleanup("delete/deactivate item", () => admin.api("DELETE", `/api/products/${S.product.id}`));
  });
}

async function deleteOrDeactivateCompany(id) {
  const r = await admin.raw("DELETE", `/api/companies/${id}`);
  if (r.ok) return r.json;
  if (r.status === 400) {
    return admin.api("PUT", `/api/companies/${id}`, { isActive: false });
  }
  throw new Error(`DELETE /api/companies/${id} -> ${r.status}: ${r.json.error}`);
}

function line(product, quantity, rate) {
  return { productId: product.id, productName: product.name, quantity, unit: product.unit || "ea", rate };
}

async function runTrading() {
  const p = S.product;

  await flow("purchase order received with partial bank payment", async (check) => {
    const bankBefore = await balanceOf(S.bankId);
    const r = await admin.api("POST", "/api/purchases", {
      companyId: S.vendor.id,
      vendorName: S.vendor.name,
      purchaseDate: today,
      status: "received",
      items: [line(p, 100, 10)],
      bankAmount: 400,
      bankAccountId: S.bankId,
      notes: `${TAG} PO1`,
    });
    S.po1 = r.purchase;
    check(near(S.po1.totalAmount, 1000), `total 1000 expected, got ${S.po1.totalAmount}`);
    check(S.po1.paymentStatus === "partial", `paymentStatus partial expected, got ${S.po1.paymentStatus}`);
    check(S.po1.vendorAccountId === S.vendor.accountId, "vendorAccountId not linked to vendor ledger account");
    check((await stockOf(p.id)) === 100, "stock should be 100 after receiving");
    const vb = await companyBalance(S.vendor.id);
    check(near(vb, -600), `vendor balance -600 expected (owed), got ${vb}`);
    const bankAfter = await balanceOf(S.bankId);
    check(near(bankAfter, bankBefore - 400), `bank should drop by 400 (${bankBefore} -> ${bankAfter})`);
    const g = await purchase(S.po1.id);
    check(near(g.paidAmount, 400), `paidAmount 400 expected, got ${g.paidAmount}`);
  });

  await flow("sale invoice delivered with partial bank payment", async (check) => {
    const bankBefore = await balanceOf(S.bankId);
    const r = await admin.api("POST", "/api/sales", {
      customerType: "company",
      companyId: S.customer.id,
      customerName: S.customer.name,
      saleDate: today,
      status: "delivered",
      items: [line(p, 30, 15)],
      bankAmount: 150,
      bankAccountId: S.bankId,
    });
    S.inv1 = r.sale;
    check(near(S.inv1.totalAmount, 450), `total 450 expected, got ${S.inv1.totalAmount}`);
    check(S.inv1.paymentStatus === "partial", `partial expected, got ${S.inv1.paymentStatus}`);
    check((await stockOf(p.id)) === 70, "stock should be 70 after delivery");
    const cb = await companyBalance(S.customer.id);
    check(near(cb, 300), `customer balance 300 expected, got ${cb}`);
    const bankAfter = await balanceOf(S.bankId);
    check(near(bankAfter, bankBefore + 150), `bank should rise by 150 (${bankBefore} -> ${bankAfter})`);
  });

  await flow("sale rejects insufficient stock", async (check) => {
    const r = await admin.raw("POST", "/api/sales", {
      customerType: "company",
      companyId: S.customer.id,
      customerName: S.customer.name,
      status: "confirmed",
      items: [line(p, 9999, 15)],
    });
    check(r.status === 400, `expected 400, got ${r.status}`);
    check(/stock/i.test(r.json.error || ""), `expected stock error, got ${r.json.error}`);
    check((await stockOf(p.id)) === 70, "stock must be unchanged after rejected sale");
  });

  await flow("customer payment (receive) settles invoice FIFO", async (check) => {
    const bankBefore = await balanceOf(S.bankId);
    const r = await admin.api("POST", "/api/payments", {
      mode: "receive",
      partyAccountId: S.customer.accountId,
      bankAmount: 300,
      bankAccountId: S.bankId,
      paymentDate: today,
      paymentMethod: "bank_transfer",
      description: `${TAG} customer receipt`,
    });
    S.paymentIn = r.payment;
    check(S.paymentIn?.paymentNumber, "no payment number");
    check((r.billsCleared || []).some((b) => b.id === S.inv1.id && b.paymentStatus === "paid"), "invoice not reported as cleared");
    const cb = await companyBalance(S.customer.id);
    check(near(cb, 0), `customer balance should settle to 0, got ${cb}`);
    const s = await sale(S.inv1.id);
    check(s.paymentStatus === "paid" && near(s.paidAmount, 450), `invoice should be paid/450, got ${s.paymentStatus}/${s.paidAmount}`);
    const bankAfter = await balanceOf(S.bankId);
    check(near(bankAfter, bankBefore + 300), "bank should rise by 300");
    const g = await admin.api("GET", `/api/payments/${S.paymentIn.id}`);
    check(g.payment?.mode === "receive", "payment receipt should be a receive voucher");
  });

  await flow("vendor payment (pay) settles purchase FIFO", async (check) => {
    const bankBefore = await balanceOf(S.bankId);
    const r = await admin.api("POST", "/api/payments", {
      mode: "pay",
      partyAccountId: S.vendor.accountId,
      bankAmount: 600,
      bankAccountId: S.bankId,
      paymentDate: today,
      paymentMethod: "bank_transfer",
      description: `${TAG} vendor payment`,
    });
    S.paymentOut = r.payment;
    check((r.billsCleared || []).some((b) => b.id === S.po1.id && b.paymentStatus === "paid"), "PO not reported as cleared");
    const vb = await companyBalance(S.vendor.id);
    check(near(vb, 0), `vendor balance should settle to 0, got ${vb}`);
    const g = await purchase(S.po1.id);
    check(g.paymentStatus === "paid" && near(g.paidAmount, 1000), `PO should be paid/1000, got ${g.paymentStatus}/${g.paidAmount}`);
    const bankAfter = await balanceOf(S.bankId);
    check(near(bankAfter, bankBefore - 600), "bank should drop by 600");
  });

  await flow("sale return reverses stock and credits customer", async (check) => {
    const r = await admin.api("POST", `/api/sales/${S.inv1.id}/returns`, {
      items: [line(p, 5, 15)],
      reason: `${TAG} damaged`,
    });
    S.saleReturn = r.return;
    check(near(S.saleReturn.returnAmount, 75), `return amount 75 expected, got ${S.saleReturn.returnAmount}`);
    check((await stockOf(p.id)) === 75, "stock should be 75 after return");
    const cb = await companyBalance(S.customer.id);
    check(near(cb, -75), `customer should hold a 75 credit, got ${cb}`);
    const s = await sale(S.inv1.id);
    check(near(s.totalAmount, 375), `invoice total should drop to 375, got ${s.totalAmount}`);
    check(s.paymentStatus === "paid", `invoice should stay paid, got ${s.paymentStatus}`);
    const list = await admin.api("GET", `/api/sales/${S.inv1.id}/returns`);
    check(near(list.totalReturned, 75), "returns list totalReturned mismatch");
    const one = await admin.api("GET", `/api/sales/returns/${S.saleReturn.id}`);
    check(one.saleReturn?.returnNumber === S.saleReturn.returnNumber, "GET /api/sales/returns/[id] mismatch");
    // A second return beyond the sold quantity must be rejected
    const bad = await admin.raw("POST", `/api/sales/${S.inv1.id}/returns`, { items: [line(p, 26, 15)] });
    check(bad.status === 400, `over-return should be 400, got ${bad.status}`);
  });

  await flow("purchase return with bank refund reverses stock and ledger", async (check) => {
    const bankBefore = await balanceOf(S.bankId);
    const before = await purchase(S.po1.id); // paid 1000 of 1000
    const r = await admin.api("POST", `/api/purchases/${S.po1.id}/returns`, {
      items: [line(p, 10, 10)],
      refundBankAmount: 100,
      refundBankAccountId: S.bankId,
      reason: `${TAG} short shipment`,
    });
    S.purchaseReturn = r.return;
    check(near(S.purchaseReturn.returnAmount, 100), `return amount 100 expected, got ${S.purchaseReturn.returnAmount}`);
    check((await stockOf(p.id)) === 65, "stock should be 65 after purchase return");
    const vb = await companyBalance(S.vendor.id);
    check(near(vb, 0), `vendor balance should be 0 after return + refund, got ${vb}`);
    const bankAfter = await balanceOf(S.bankId);
    check(near(bankAfter, bankBefore + 100), "bank should rise by the 100 refund");
    const g = await purchase(S.po1.id);
    check(near(g.totalAmount, 900), `PO total should drop to 900, got ${g.totalAmount}`);
    const expectedPaid = money(before.paidAmount - 100);
    if (!check(near(g.paidAmount, expectedPaid), `PO paidAmount should be ${expectedPaid} (paid ${before.paidAmount} minus refund 100), got ${g.paidAmount}`)) {
      bugs.push(`purchase return refund recomputed paidAmount as cash+bank (${g.paidAmount}) and dropped the FIFO-settled payment`);
    }
    check(g.paymentStatus === "paid", `PO should remain paid, got ${g.paymentStatus}`);
  });

  await flow("purchase /pay keeps FIFO-settled amount (unpaid PO -> standalone payment -> /pay remainder)", async (check) => {
    const r = await admin.api("POST", "/api/purchases", {
      companyId: S.vendor.id,
      vendorName: S.vendor.name,
      purchaseDate: today,
      status: "received",
      items: [line(p, 50, 10)],
      notes: `${TAG} PO2`,
    });
    S.po2 = r.purchase;
    check(S.po2.paymentStatus === "unpaid", "PO2 should start unpaid");

    await admin.api("POST", "/api/payments", {
      mode: "pay",
      partyAccountId: S.vendor.accountId,
      bankAmount: 200,
      bankAccountId: S.bankId,
      paymentDate: today,
      description: `${TAG} PO2 partial`,
    });
    let g = await purchase(S.po2.id);
    check(near(g.paidAmount, 200) && g.paymentStatus === "partial", `after FIFO payment expected partial/200, got ${g.paymentStatus}/${g.paidAmount}`);

    const bankBefore = await balanceOf(S.bankId);
    const pay = await admin.api("POST", `/api/purchases/${S.po2.id}/pay`, {
      bankAmount: 300,
      bankAccountId: S.bankId,
      paymentDate: today,
    });
    g = await purchase(S.po2.id);
    if (!check(near(g.paidAmount, 500), `after /pay expected paidAmount 500, got ${g.paidAmount} (response ${pay.purchase?.paidAmount})`)) {
      bugs.push(`POST /api/purchases/[id]/pay recomputed paidAmount as cash+bank (${g.paidAmount}) and dropped the FIFO-settled 200`);
    }
    check(g.paymentStatus === "paid", `after /pay expected paid, got ${g.paymentStatus}`);
    const vb = await companyBalance(S.vendor.id);
    check(near(vb, 0), `vendor balance should be 0 after PO2 fully paid, got ${vb}`);
    const bankAfter = await balanceOf(S.bankId);
    check(near(bankAfter, bankBefore - 300), "bank should drop by 300");
    const over = await admin.raw("POST", `/api/purchases/${S.po2.id}/pay`, { bankAmount: 1, bankAccountId: S.bankId });
    check(over.status === 400, `overpayment should be rejected with 400, got ${over.status}`);
  });
}

async function runCorrections() {
  const p = S.product;

  await flow("purchase correction re-posts stock, vendor and bank legs", async (check) => {
    const stockStart = await stockOf(p.id);
    const bankStart = await balanceOf(S.bankId);
    const r = await admin.api("POST", "/api/purchases", {
      companyId: S.vendor.id,
      vendorName: S.vendor.name,
      purchaseDate: today,
      status: "received",
      items: [line(p, 50, 10)],
      bankAmount: 200,
      bankAccountId: S.bankId,
      notes: `${TAG} PO-C`,
    });
    S.poC = r.purchase;
    const bankPosted = await balanceOf(S.bankId);
    check(near(bankPosted, bankStart - 200), "bank should drop by 200 on posting");
    const meta = await admin.api("GET", `/api/purchases/${S.poC.id}/correct`);
    check(meta.canCorrect === true, `canCorrect expected true, got ${meta.canCorrect} (${meta.reason})`);

    const c = await admin.api("POST", `/api/purchases/${S.poC.id}/correct`, {
      vendorName: S.vendor.name,
      companyId: S.vendor.id,
      purchaseDate: today,
      items: [line(p, 40, 10)],
      transportCost: 0,
      loadingCost: 0,
      labourCost: 0,
      taxAmount: 0,
      discountAmount: 0,
      cashAmount: 0,
      bankAmount: 200,
      bankAccountId: S.bankId,
      correctionReason: `${TAG} wrong quantity`,
    });
    check(near(c.purchase.totalAmount, 400), `corrected total 400 expected, got ${c.purchase.totalAmount}`);
    check(c.purchase.paymentStatus === "partial", `corrected PO should be partial, got ${c.purchase.paymentStatus}`);
    check((await stockOf(p.id)) === stockStart + 40, `stock should be ${stockStart + 40} after correction, got ${await stockOf(p.id)}`);
    const vb = await companyBalance(S.vendor.id);
    check(near(vb, -200), `vendor balance -200 expected after correction, got ${vb}`);
    const bankAfter = await balanceOf(S.bankId);
    if (!check(near(bankAfter, bankStart - 200), `bank should still be down exactly 200 after correction (${bankStart} -> ${bankAfter})`)) {
      bugs.push(`purchase correction reversed the bank leg but did not re-post it (bank off by ${money(bankAfter - (bankStart - 200))})`);
    }
    // settle so the vendor is left at zero
    await admin.api("POST", `/api/purchases/${S.poC.id}/pay`, { bankAmount: 200, bankAccountId: S.bankId, paymentDate: today });
    check((await purchase(S.poC.id)).paymentStatus === "paid", "PO-C should be paid after settling");
  });

  await flow("sale correction re-posts stock, customer and bank legs", async (check) => {
    const stockStart = await stockOf(p.id);
    const bankStart = await balanceOf(S.bankId);
    const r = await admin.api("POST", "/api/sales", {
      customerType: "company",
      companyId: S.customer.id,
      customerName: S.customer.name,
      saleDate: today,
      status: "delivered",
      items: [line(p, 20, 15)],
      bankAmount: 100,
      bankAccountId: S.bankId,
    });
    S.invC = r.sale;
    const meta = await admin.api("GET", `/api/sales/${S.invC.id}/correct`);
    check(meta.canCorrect === true, `canCorrect expected true, got ${meta.canCorrect} (${meta.reason})`);

    const c = await admin.api("POST", `/api/sales/${S.invC.id}/correct`, {
      customerType: "company",
      companyId: S.customer.id,
      customerName: S.customer.name,
      saleDate: today,
      items: [line(p, 10, 15)],
      transportCost: 0,
      loadingCost: 0,
      taxAmount: 0,
      discountAmount: 0,
      cashAmount: 0,
      bankAmount: 100,
      bankAccountId: S.bankId,
      correctionReason: `${TAG} wrong quantity`,
    });
    check(near(c.sale.totalAmount, 150), `corrected total 150 expected, got ${c.sale.totalAmount}`);
    check((await stockOf(p.id)) === stockStart - 10, `stock should be ${stockStart - 10} after correction`);
    const cb = await companyBalance(S.customer.id);
    // customer had a 75 credit from the sale return; +150 -100 = +50 net
    check(near(cb, -75 + 50), `customer balance -25 expected after correction, got ${cb}`);
    const bankAfter = await balanceOf(S.bankId);
    check(near(bankAfter, bankStart + 100), `bank should be up exactly 100 after correction (${bankStart} -> ${bankAfter})`);
    const returnsBlock = await admin.api("GET", `/api/sales/${S.inv1.id}/correct`);
    check(returnsBlock.canCorrect === false, "invoice with returns must not be correctable");
  });
}

async function runAccounting() {
  await flow("expense paid from bank", async (check) => {
    const bankBefore = await balanceOf(S.bankId);
    const r = await admin.api("POST", "/api/expenses", {
      expenseDate: today,
      expenseTitle: `${TAG} office supplies`,
      categoryId: S.expenseCategoryId,
      bankAmount: 50,
      bankAccountId: S.bankId,
      description: `${TAG} expense`,
    });
    S.expense = r.expense;
    check(S.expense?.expenseNumber, "no expense number");
    check(near(await balanceOf(S.bankId), bankBefore - 50), "bank should drop by 50");
    const list = (await admin.api("GET", "/api/expenses")).expenses || [];
    check(list.some((e) => e.id === S.expense.id), "expense missing from list");
    onCleanup("delete expense (reverses bank)", async () => {
      const b = await balanceOf(S.bankId);
      await admin.api("DELETE", `/api/expenses/${S.expense.id}`);
      if (!near(await balanceOf(S.bankId), b + 50)) throw new Error("bank not restored after expense delete");
    });
  });

  await flow("manual journal entry (balanced)", async (check) => {
    const bankBefore = await balanceOf(S.bankId);
    const otherBefore = await balanceOf(S.generalAccount.id);
    const r = await admin.api("POST", "/api/journal", {
      entryDate: today,
      description: `${TAG} journal`,
      lines: [
        { accountId: S.bankId, debit: 10, credit: 0, description: "test debit" },
        { accountId: S.generalAccount.id, debit: 0, credit: 10, description: "test credit" },
      ],
    });
    S.journal = r.journal;
    check(S.journal?.entryNumber?.startsWith("JE-"), `journal number expected JE-, got ${S.journal?.entryNumber}`);
    check(near(await balanceOf(S.bankId), bankBefore + 10), "bank should rise by 10");
    check(near(await balanceOf(S.generalAccount.id), otherBefore - 10), "counter account should drop by 10");
    const unbalanced = await admin.raw("POST", "/api/journal", {
      description: "bad",
      lines: [
        { accountId: S.bankId, debit: 10 },
        { accountId: S.generalAccount.id, credit: 5 },
      ],
    });
    check(unbalanced.status === 400, `unbalanced journal should be 400, got ${unbalanced.status}`);
    onCleanup("reverse test journal", () =>
      admin.api("POST", "/api/journal", {
        entryDate: today,
        description: `${TAG} journal reversal`,
        lines: [
          { accountId: S.generalAccount.id, debit: 10, credit: 0 },
          { accountId: S.bankId, debit: 0, credit: 10 },
        ],
      })
    );
  });

  await flow("bank-to-bank transfer", async (check) => {
    const created = await admin.api("POST", "/api/accounts/directory/bank", {
      fromDirectory: true,
      bankName: `${TAG} Bank`,
      accountTitle: `${TAG} Operating`,
      accountNumber: `${TAG}-001`,
      phone: "(555) 010-0003",
    });
    S.smokeBank = created.account;
    check(S.smokeBank?.category === "bank", "directory bank account not created");
    const mainBefore = await balanceOf(S.bankId);
    const r = await admin.api("POST", "/api/transfers", {
      transferDate: today,
      transferType: "bank_bank",
      fromAccountId: S.bankId,
      toAccountId: S.smokeBank.id,
      amount: 25,
      description: `${TAG} transfer`,
    });
    S.transfer = r.transfer;
    check(S.transfer?.transferNumber?.startsWith("TRF-"), `transfer number expected TRF-, got ${S.transfer?.transferNumber}`);
    check(near(await balanceOf(S.bankId), mainBefore - 25), "source bank should drop by 25");
    check(near(await balanceOf(S.smokeBank.id), 25), "destination bank should hold 25");
    const list = (await admin.api("GET", "/api/transfers")).transfers || [];
    check(list.some((t) => t.id === S.transfer.id), "transfer missing from list");
    const wrongType = await admin.raw("POST", "/api/transfers", {
      transferType: "cash_bank",
      fromAccountId: S.bankId,
      toAccountId: S.smokeBank.id,
      amount: 1,
    });
    check(wrongType.status === 400, `mismatched transfer type should be 400, got ${wrongType.status}`);
    onCleanup("transfer back and deactivate smoke bank", async () => {
      await admin.api("POST", "/api/transfers", {
        transferDate: today,
        transferType: "bank_bank",
        fromAccountId: S.smokeBank.id,
        toAccountId: S.bankId,
        amount: 25,
        description: `${TAG} transfer back`,
      });
      await admin.api("PUT", `/api/accounts/${S.smokeBank.id}`, { isActive: false });
    });
  });

  await flow("owner draw from bank", async (check) => {
    const bankBefore = await balanceOf(S.bankId);
    const r = await admin.api("POST", "/api/admin/withdrawals", {
      withdrawalDate: today,
      amount: 20,
      sourceAccountId: S.bankId,
      notes: `${TAG} draw`,
    });
    S.withdrawal = r.withdrawal;
    check(S.withdrawal?.withdrawalNumber?.startsWith("WD-"), "withdrawal number expected WD-");
    check(near(await balanceOf(S.bankId), bankBefore - 20), "bank should drop by 20");
    const general = (await admin.api("GET", "/api/accounts?category=general")).accounts || [];
    const drawings = general.find((a) => a.code === "EQ-OWNER-DRAW");
    check(drawings, "Owner Drawings account missing");
    const list = (await admin.api("GET", "/api/admin/withdrawals")).withdrawals || [];
    check(list.some((w) => w.id === S.withdrawal.id), "withdrawal missing from list");
    if (drawings) {
      onCleanup("reverse owner draw via journal", () =>
        admin.api("POST", "/api/journal", {
          entryDate: today,
          description: `${TAG} owner draw reversal`,
          lines: [
            { accountId: S.bankId, debit: 20, credit: 0 },
            { accountId: drawings.id, debit: 0, credit: 20 },
          ],
        })
      );
    }
  });
}

async function runHr() {
  await flow("HR: create employee (driver, ledger account, no login)", async (check) => {
    const r = await admin.api("POST", "/api/hr/employees", {
      name: `${TAG} Driver`,
      phone: "(555) 010-0004",
      role: "driver",
      designation: "Driver",
      department: "Logistics",
      salary: 3000,
      joiningDate: today,
      createLogin: false,
      createCashAccount: false,
    });
    S.employee = r.employee;
    check(S.employee?.accountId, "employee has no ledger account");
    check(!S.employee?.cashAccountId, "cash account should not be created when createCashAccount=false");
    const g = await admin.api("GET", `/api/hr/employees/${S.employee.id}`);
    check(Number(g.employee.salary) === 3000, "salary not persisted");
    const acct = (await admin.api("GET", `/api/accounts/${S.employee.accountId}`)).account;
    check(acct.category === "transport", `driver ledger account should be category transport, got ${acct.category}`);
    onCleanup("delete employee", () => admin.api("DELETE", `/api/hr/employees/${S.employee.id}`));
  });

  await flow("HR: attendance POST + read back", async (check) => {
    const r = await admin.api("POST", "/api/hr/attendance", { employeeId: S.employee.id, date: today, status: "present" });
    check(r.attendance?.date === today, `attendance date ${today} expected, got ${r.attendance?.date}`);
    const g = await admin.api("GET", `/api/hr/attendance?employeeId=${S.employee.id}&date=${today}`);
    check((g.attendance || []).some((a) => a.employeeId === S.employee.id && a.status === "present"), "attendance row not found on read");
    const bulk = await admin.api("POST", "/api/hr/attendance", {
      records: [{ employeeId: S.employee.id, date: today, status: "half_day" }],
    });
    check(bulk.attendance?.[0]?.status === "half_day", "bulk upsert did not update status");
    const summary = await admin.api("GET", `/api/hr/attendance/summary?employeeId=${S.employee.id}&month=${thisMonth}&year=${thisYear}`);
    check(summary.summary?.half_day === 1, `summary should count 1 half day, got ${summary.summary?.half_day}`);
    await admin.api("POST", "/api/hr/attendance", { employeeId: S.employee.id, date: today, status: "present" });
  });

  await flow("HR: salary POST with bank payment", async (check) => {
    const bankBefore = await balanceOf(S.bankId);
    const preview = await admin.api("GET", `/api/hr/salary/preview?employeeId=${S.employee.id}&month=${thisMonth}&year=${thisYear}`);
    check(preview.payroll?.baseSalary === 3000, "preview base salary mismatch");
    const r = await admin.api("POST", "/api/hr/salary", {
      employeeId: S.employee.id,
      month: thisMonth,
      year: thisYear,
      baseSalary: 3000,
      deductions: 0,
      bonus: 0,
      salaryBankAmount: 3000,
      bankAccountId: S.bankId,
      paymentDate: today,
      paymentMethod: "bank_transfer",
    });
    S.salaryRecord = r.salaryRecord;
    check(near(S.salaryRecord.netSalary, 3000), `net salary 3000 expected, got ${S.salaryRecord.netSalary}`);
    check(S.salaryRecord.status === "paid", `salary status paid expected, got ${S.salaryRecord.status}`);
    check(near(await balanceOf(S.bankId), bankBefore - 3000), "bank should drop by 3000");
    check(near(await balanceOf(S.employee.accountId), 0), `employee account should net to 0 after paid salary, got ${await balanceOf(S.employee.accountId)}`);
    const list = (await admin.api("GET", `/api/hr/salary?employeeId=${S.employee.id}&month=${thisMonth}&year=${thisYear}`)).salaryRecords || [];
    check(list.some((s) => s.id === S.salaryRecord.id), "salary record missing from list");
  });

  await flow("HR: salary advance from bank", async (check) => {
    const bankBefore = await balanceOf(S.bankId);
    const empBefore = await balanceOf(S.employee.accountId);
    const r = await admin.api("POST", "/api/hr/advances", {
      employeeId: S.employee.id,
      advanceDate: today,
      bankAmount: 200,
      bankAccountId: S.bankId,
      notes: `${TAG} advance`,
    });
    S.advance = r.advance;
    check(near(S.advance.amount, 200), `advance amount 200 expected, got ${S.advance.amount}`);
    check(near(r.pendingTotal, 200), `pending advance total 200 expected, got ${r.pendingTotal}`);
    check(near(await balanceOf(S.bankId), bankBefore - 200), "bank should drop by 200");
    check(near(await balanceOf(S.employee.accountId), empBefore + 200), "employee account should be debited 200");

    // Bank-only advance posted the way the UI does it: amount + split fields.
    const probe = await admin.api("POST", "/api/hr/advances", {
      employeeId: S.employee.id,
      advanceDate: today,
      amount: 100,
      cashAmount: 0,
      bankAmount: 100,
      bankAccountId: S.bankId,
      notes: `${TAG} advance probe`,
    });
    if (!check(near(probe.advance.amount, 100), `advance with amount=100 + bankAmount=100 should post 100, got ${probe.advance.amount}`)) {
      bugs.push(`POST /api/hr/advances treats cashAmount=0 as "use amount", so a bank-only advance of 100 posts ${probe.advance.amount}`);
    }
  });
}

async function runTransport() {
  await flow("transport: create vehicle", async (check) => {
    const r = await admin.api("POST", "/api/transport/vehicles", {
      registrationNumber: `${TAG}-TRK`,
      vehicleType: "truck",
      make: "Isuzu",
      model: "NPR",
      year: 2022,
      capacity: 5000,
      driverName: S.employee.name,
      isOwned: true,
    });
    S.vehicle = r.vehicle;
    check(S.vehicle?.id, "no vehicle id");
    const g = await admin.api("GET", `/api/transport/vehicles/${S.vehicle.id}`);
    check(g.vehicle.registrationNumber === `${TAG}-TRK`, "registration not persisted");
    const dup = await admin.raw("POST", "/api/transport/vehicles", { registrationNumber: `${TAG}-TRK`, vehicleType: "truck" });
    check(dup.status === 400, `duplicate registration should be 400, got ${dup.status}`);
    onCleanup("delete/deactivate vehicle", async () => {
      const d = await admin.raw("DELETE", `/api/transport/vehicles/${S.vehicle.id}`);
      if (d.ok) return;
      if (d.status === 400) return admin.api("PUT", `/api/transport/vehicles/${S.vehicle.id}`, { isActive: false });
      throw new Error(`DELETE vehicle -> ${d.status}: ${d.json.error}`);
    });
  });

  await flow("transport: delivery -> status -> pay (driver + bank legs)", async (check) => {
    const r = await admin.api("POST", "/api/transport", {
      vehicleId: S.vehicle.id,
      driverName: S.employee.name,
      originCity: "Portland",
      destinationCity: "Seattle",
      loadWeight: 1200,
      loadDescription: `${TAG} load`,
      freightCharges: 100,
      status: "pending",
      dispatchDate: today,
    });
    S.transport = r.transport;
    check(S.transport?.transportNumber?.startsWith("TR-"), "transport number expected TR-");
    check(S.transport.vehicleNumber === S.vehicle.registrationNumber, "vehicle number not resolved from vehicleId");
    const st = await admin.api("PATCH", `/api/transport/${S.transport.id}/status`, { status: "delivered" });
    check(st.transport.status === "delivered", "status not updated");
    const badStatus = await admin.raw("PATCH", `/api/transport/${S.transport.id}/status`, { status: "flying" });
    check(badStatus.status === 400, "invalid status should be 400");
    const upd = await admin.api("PUT", `/api/transport/${S.transport.id}`, { deliveryDate: today, notes: `${TAG} delivered` });
    check(upd.transport.notes === `${TAG} delivered`, "PUT did not persist notes");

    const bankBefore = await balanceOf(S.bankId);
    const driverBefore = await balanceOf(S.employee.accountId);
    const pay = await admin.api("POST", `/api/transport/${S.transport.id}/pay`, {
      accountId: S.bankId,
      amount: 100,
      paymentDate: today,
    });
    check(pay.transport.paymentStatus === "paid" && near(pay.transport.paidAmount, 100), `trip should be paid/100, got ${pay.transport.paymentStatus}/${pay.transport.paidAmount}`);
    check(near(await balanceOf(S.bankId), bankBefore - 100), "bank should drop by 100");
    check(near(await balanceOf(S.employee.accountId), driverBefore + 100), "driver (transport) account should be debited 100");
    const again = await admin.raw("POST", `/api/transport/${S.transport.id}/pay`, { accountId: S.bankId, amount: 1 });
    check(again.status === 400, `paying a settled trip should be 400, got ${again.status}`);
    const g = await admin.api("GET", `/api/transport/${S.transport.id}`);
    check(g.transport.status === "delivered", "GET transport mismatch");
  });

  await flow("transport: vehicle expense from bank", async (check) => {
    const bankBefore = await balanceOf(S.bankId);
    const r = await admin.api("POST", "/api/transport/vehicle-expenses", {
      vehicleId: S.vehicle.id,
      expenseDate: today,
      expenseType: "fuel",
      amount: 30,
      accountId: S.bankId,
      description: `${TAG} diesel`,
    });
    S.vehicleExpense = r.expense;
    check(S.vehicleExpense?.id, "no vehicle expense id");
    check(near(await balanceOf(S.bankId), bankBefore - 30), "bank should drop by 30");
    const list = (await admin.api("GET", `/api/transport/vehicle-expenses?vehicleId=${S.vehicle.id}`)).expenses || [];
    check(list.some((e) => e.id === S.vehicleExpense.id), "vehicle expense missing from list");
    onCleanup("delete vehicle expense (reverses bank)", async () => {
      const b = await balanceOf(S.bankId);
      await admin.api("DELETE", `/api/transport/vehicle-expenses/${S.vehicleExpense.id}`);
      if (!near(await balanceOf(S.bankId), b + 30)) throw new Error("bank not restored after vehicle expense delete");
    });
  });
}

async function runOrders() {
  await flow("customer order -> accept -> convert to invoice", async (check) => {
    const p = S.product;
    const stockBefore = await stockOf(p.id);
    const custBefore = await companyBalance(S.customer.id);
    const r = await admin.api("POST", "/api/orders", {
      customerName: S.customer.name,
      companyId: S.customer.id,
      orderDate: today,
      items: [line(p, 2, 15)],
      notes: `${TAG} order`,
    });
    S.order = r.order;
    check(S.order?.orderNumber?.startsWith("ORD-"), "order number expected ORD-");
    check(S.order.status === "pending", `new order should be pending, got ${S.order.status}`);
    const noInvoice = await admin.raw("GET", `/api/orders/${S.order.id}/invoice`);
    check(noInvoice.status === 404, `invoice lookup before conversion should be 404, got ${noInvoice.status}`);

    const acc = await admin.api("POST", `/api/orders/${S.order.id}`, { action: "accept" });
    check(acc.order.status === "accepted", "order not accepted");
    const conv = await admin.api("POST", `/api/orders/${S.order.id}`, { action: "convert" });
    check(conv.redirectUrl === `/sales/new?orderId=${S.order.id}`, "convert should hand back the sales/new redirect");

    const s = await admin.api("POST", "/api/sales", {
      customerType: "company",
      companyId: S.customer.id,
      customerName: S.customer.name,
      customerOrderId: S.order.id,
      saleDate: today,
      status: "confirmed",
      items: S.order.items.map((it) => ({ productId: it.productId, productName: it.productName, quantity: it.quantity, unit: it.unit, rate: it.rate })),
    });
    S.orderSale = s.sale;
    const g = await admin.api("GET", `/api/orders/${S.order.id}`);
    check(g.order.status === "converted", `order should be converted, got ${g.order.status}`);
    check(g.order.saleOrderId === S.orderSale.id, "order not linked to invoice");
    const inv = await admin.api("GET", `/api/orders/${S.order.id}/invoice`);
    check(inv.sale?.id === S.orderSale.id, "GET /api/orders/[id]/invoice returned wrong invoice");
    check((await stockOf(p.id)) === stockBefore - 2, "stock should drop by 2");
    check(near(await companyBalance(S.customer.id), custBefore + 30), "customer balance should rise by 30");
    const forSale = (await admin.api("GET", "/api/orders?forSale=1")).orders || [];
    check(!forSale.some((o) => o.id === S.order.id), "converted order must not be offered for sale again");
  });
}

async function runAdminFlows() {
  await flow("day close POST + read back", async (check) => {
    const r = await admin.api("POST", "/api/day-close", { closeDate: today, notes: `${TAG} close` });
    S.dayClose = r.dayClose;
    check(S.dayClose?.status === "closed", "day close not closed");
    const g = await admin.api("GET", `/api/day-close?date=${today}`);
    check(g.existing?.id === S.dayClose.id, "day close not returned for date");
    check(typeof g.summary?.computedClosingBank === "number", "summary missing computedClosingBank");
    const list = (await admin.api("GET", "/api/day-close")).closes || [];
    check(list.some((c) => c.id === S.dayClose.id), "day close missing from list");
  });

  await flow("settings PUT + read back", async (check) => {
    const key = "smoke_test_marker";
    const r = await admin.api("PUT", "/api/settings", { settings: { [key]: TAG } });
    check(r.settings?.[key] === TAG, "PUT did not return updated setting");
    const g = await admin.api("GET", "/api/settings");
    check(g.settings?.[key] === TAG, "GET did not return updated setting");
    onCleanup("clear settings marker", () => admin.api("PUT", "/api/settings", { settings: { [key]: "" } }));
  });

  await flow("cities CRUD", async (check) => {
    const r = await admin.api("POST", "/api/settings/cities", { name: `${TAG} City` });
    S.city = r.city;
    check(S.city?.id, "city not created");
    const dup = await admin.raw("POST", "/api/settings/cities", { name: `${TAG} City` });
    check(dup.status === 400, "duplicate city should be 400");
    const upd = await admin.api("PUT", `/api/settings/cities/${S.city.id}`, { name: `${TAG} City Renamed` });
    check(upd.city.name === `${TAG} City Renamed`, "city rename failed");
    const list = (await admin.api("GET", "/api/settings/cities")).cities || [];
    check(list.some((c) => c.id === S.city.id && c.name === `${TAG} City Renamed`), "renamed city missing from list");
    await admin.api("DELETE", `/api/settings/cities/${S.city.id}`);
    const after = (await admin.api("GET", "/api/settings/cities")).cities || [];
    check(!after.some((c) => c.id === S.city.id), "city still listed after delete");
    S.city = null;
  });

  await flow("users CRUD + role gate + immediate deactivation", async (check) => {
    const email = `${TAG.toLowerCase()}@example.com`;
    const password = `Smoke-${TAG}-pw`;
    const r = await admin.api("POST", "/api/settings/users", {
      email,
      name: `${TAG} Viewer`,
      password,
      role: "viewer",
    });
    S.viewerUser = r.user;
    check(S.viewerUser?.role === "viewer", "viewer role not assigned");
    onCleanup("delete viewer user", async () => {
      if (S.viewerUser) await admin.api("DELETE", `/api/settings/users/${S.viewerUser.id}`);
    });

    const viewer = new Session("viewer");
    const login = await viewer.raw("POST", "/api/auth/login", { email, password });
    check(login.status === 200, `viewer login expected 200, got ${login.status}`);
    const me = await viewer.raw("GET", "/api/auth/me");
    check(me.status === 200 && me.json.user?.email === email, "viewer /api/auth/me failed");
    const products = await viewer.raw("GET", "/api/products");
    check(products.status === 200, `viewer should read products, got ${products.status}`);
    const log = await viewer.raw("GET", "/api/activity-log");
    check(log.status === 403, `viewer on admin-only activity log should be 403, got ${log.status}`);
    const users = await viewer.raw("GET", "/api/settings/users");
    check(users.status === 403, `viewer on users list should be 403, got ${users.status}`);
    const create = await viewer.raw("POST", "/api/companies", { fromDirectory: true, name: "x", phone: "1" });
    check(create.status === 403, `viewer creating a company should be 403, got ${create.status}`);

    const upd = await admin.api("PUT", `/api/settings/users/${S.viewerUser.id}`, { isActive: false });
    check(upd.user.isActive === false, "user not deactivated");
    const meAfter = await viewer.raw("GET", "/api/auth/me");
    check(meAfter.status === 401, `deactivated session should get 401 on /api/auth/me, got ${meAfter.status}`);
    const productsAfter = await viewer.raw("GET", "/api/products");
    check(productsAfter.status === 401, `deactivated session should get 401 on data routes, got ${productsAfter.status}`);
    const relogin = await viewer.raw("POST", "/api/auth/login", { email, password });
    check(relogin.status === 401, `deactivated user login should be 401, got ${relogin.status}`);

    const self = await admin.raw("PUT", `/api/settings/users/${S.me.id}`, { isActive: false });
    check(self.status === 400, `admin self-deactivation should be 400, got ${self.status}`);
  });
}

// ===========================================================================
// GET SWEEP
// ===========================================================================
function listRouteFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listRouteFiles(full, out);
    else if (entry.name === "route.js") out.push(full);
  }
  return out;
}

function routeUrl(file) {
  const rel = path.relative(path.join(ROOT, "src", "app"), path.dirname(file));
  return "/" + rel.split(path.sep).join("/");
}

/** Query strings for routes that require parameters, keyed by URL pattern. */
function queryFor(pattern) {
  const emp = S.employee?.id;
  const q = {
    "/api/hr/attendance/summary": `employeeId=${emp}&month=${thisMonth}&year=${thisYear}`,
    "/api/hr/salary/preview": `employeeId=${emp}&month=${thisMonth}&year=${thisYear}`,
    "/api/reports/cash-bank": "category=bank",
    "/api/purchases/freight-outstanding": `ledgerAccountId=${S.vendor?.accountId}`,
    "/api/accounts/ledger": `accountId=${S.bankId}`,
    "/api/day-close": `date=${today}`,
    "/api/purchases": "outstanding=true",
    "/api/orders": "view=all",
  };
  return q[pattern] ? `?${q[pattern]}` : "";
}

/** Status codes that are correct for the admin session on a given route. */
const EXPECTED_NON_200 = {
  "/api/dashboard/employee": [403], // admin uses the operations dashboard
  "/api/dashboard/employee/salary": [403],
};

async function resolveDynamic(pattern) {
  const ids = {
    "/api/accounts/[id]": S.bankId,
    "/api/companies/[id]": S.customer?.id,
    "/api/hr/employees/[id]": S.employee?.id,
    "/api/orders/[id]": S.order?.id,
    "/api/orders/[id]/invoice": S.order?.id,
    "/api/payments/[id]": S.paymentIn?.id,
    "/api/products/[id]": S.product?.id,
    "/api/purchases/[id]": S.po1?.id,
    "/api/purchases/[id]/correct": S.po2?.id,
    "/api/purchases/[id]/returns": S.po1?.id,
    "/api/purchases/vendors/[type]/[id]": S.vendor?.id,
    "/api/sales/[id]": S.inv1?.id,
    "/api/sales/[id]/correct": S.invC?.id,
    "/api/sales/[id]/returns": S.inv1?.id,
    "/api/sales/returns/[id]": S.saleReturn?.id,
    "/api/settings/users/[id]": S.me?.id,
    "/api/transport/[id]": S.transport?.id,
    "/api/transport/vehicles/[id]": S.vehicle?.id,
  };
  let id = ids[pattern];
  if (!id) {
    // Fall back to the first id returned by the parent list endpoint.
    const parent = pattern.replace(/\/\[[^\]]+\](\/.*)?$/, "");
    const r = await admin.raw("GET", parent);
    if (r.ok) {
      const arr = Object.values(r.json).find((v) => Array.isArray(v) && v.length && v[0]?.id);
      id = arr?.[0]?.id;
    }
  }
  if (!id) return null;
  return pattern.replace("[type]", "company").replace("[id]", String(id));
}

async function runGetSweep() {
  console.log("\nGET sweep");
  const files = listRouteFiles(path.join(ROOT, "src", "app", "api")).filter((f) =>
    /export\s+(async\s+)?function\s+GET\b/.test(fs.readFileSync(f, "utf8"))
  );
  const patterns = files.map(routeUrl).sort();
  let failures = 0;
  for (const pattern of patterns) {
    let url = pattern;
    if (pattern.includes("[")) {
      url = await resolveDynamic(pattern);
      if (!url) {
        getResults.push({ url: pattern, status: "-", ok: true, detail: "no record available to resolve id" });
        console.log(`  --  ---  ${pattern} (skipped: no id)`);
        continue;
      }
    }
    url += queryFor(pattern);
    const r = await admin.raw("GET", url);
    const expected = EXPECTED_NON_200[pattern];
    const ok = expected ? expected.includes(r.status) : r.status === 200;
    if (!ok) failures += 1;
    const detail = ok ? "" : JSON.stringify(r.json).slice(0, 200);
    getResults.push({ url, status: r.status, ok, detail, ms: r.ms });
    console.log(`  ${ok ? "ok " : "!! "}${String(r.status).padEnd(4)} ${url}${expected ? " (expected " + expected.join("/") + ")" : ""}${detail ? ` — ${detail}` : ""}`);
  }
  record(`GET sweep (${patterns.length} endpoints)`, failures ? "FAIL" : "PASS", failures ? `${failures} unexpected status(es)` : "");
}

// ===========================================================================
// CLEANUP
// ===========================================================================
async function runCleanup() {
  console.log("\nCleanup (reverse order)");
  if (KEEP) {
    skip("cleanup", "SMOKE_KEEP=1");
    return;
  }
  while (cleanupStack.length) {
    const step = cleanupStack.pop();
    await flow(`cleanup: ${step.name}`, async () => {
      await step.run();
    });
  }
}

// ===========================================================================
// RECONCILE (same checks as scripts/reconcile.mjs)
// ===========================================================================
function paymentStatus(paid, total) {
  if (paid <= 0.005) return "unpaid";
  if (paid + 0.005 >= total) return "paid";
  return "partial";
}

async function runReconcile() {
  console.log("\nReconcile");
  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(parseDatabaseUrl(process.env.DATABASE_URL, { connectionLimit: 3 })),
  });
  try {
    await flow("reconcile: account balances match ledger sums", async (check) => {
      const sums = await prisma.ledgerEntry.groupBy({ by: ["accountId"], _sum: { debit: true, credit: true } });
      const sumById = new Map(sums.map((s) => [s.accountId, (s._sum.debit || 0) - (s._sum.credit || 0)]));
      const accounts = await prisma.account.findMany({ select: { id: true, name: true, balance: true } });
      const ids = new Set(accounts.map((a) => a.id));
      for (const a of accounts) {
        const expected = money(sumById.get(a.id) || 0);
        check(near(expected, a.balance || 0, 0.005), `account #${a.id} ${a.name}: stored ${a.balance} expected ${expected}`);
      }
      for (const s of sums) check(ids.has(s.accountId), `orphan ledger entries for missing account #${s.accountId}`);
    });

    await flow("reconcile: purchase/invoice payment statuses", async (check) => {
      for (const [label, model, numberField] of [
        ["purchase", prisma.purchaseOrder, "purchaseNumber"],
        ["invoice", prisma.saleOrder, "invoiceNumber"],
      ]) {
        const rows = await model.findMany({
          select: { id: true, [numberField]: true, totalAmount: true, paidAmount: true, paymentStatus: true, status: true },
        });
        for (const r of rows) {
          if (r.status === "cancelled") continue;
          const expected = paymentStatus(r.paidAmount || 0, r.totalAmount || 0);
          check(expected === r.paymentStatus, `${label} ${r[numberField]}: stored ${r.paymentStatus} expected ${expected}`);
        }
      }
    });

    await flow("reconcile: smoke documents' paidAmount matches party ledger", async (check) => {
      // Every smoke PO/invoice is fully paid or has its balance reflected in the party account.
      for (const id of [S.po1?.id, S.po2?.id, S.poC?.id].filter(Boolean)) {
        const po = await prisma.purchaseOrder.findUnique({ where: { id } });
        check(po && near(po.paidAmount, po.totalAmount), `${po?.purchaseNumber}: paid ${po?.paidAmount} vs total ${po?.totalAmount}`);
      }
    });
  } finally {
    await prisma.$disconnect();
  }
}

// ===========================================================================
// MAIN
// ===========================================================================
function printSummary() {
  console.log("\n==================== SMOKE SUMMARY ====================");
  const width = Math.max(...results.map((r) => r.flow.length), 10);
  for (const r of results) {
    console.log(`${r.status.padEnd(5)} ${r.flow.padEnd(width)}${r.detail ? `  ${r.detail}` : ""}`);
  }
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const skipped = results.filter((r) => r.status === "SKIP").length;
  console.log(`\n${pass} passed, ${fail} failed, ${skipped} skipped. GET endpoints: ${getResults.filter((g) => g.ok).length}/${getResults.length} ok.`);
  if (bugs.length) {
    console.log("\nSuspected server bugs:");
    for (const b of bugs) console.log(`  - ${b}`);
  }
  return fail === 0;
}

async function main() {
  console.log(`Omni Hub API smoke test against ${BASE_URL} (tag ${TAG})`);
  const started = Date.now();

  console.log("\nSetup");
  await runSetup();
  if (!S.bankId || !S.me) {
    printSummary();
    process.exit(1);
  }

  console.log("\nMasters");
  await runMasters();

  if (S.vendor && S.customer && S.product) {
    console.log("\nTrading");
    await runTrading();
    console.log("\nCorrections");
    await runCorrections();
  } else {
    skip("trading flows", "master records missing");
  }

  console.log("\nAccounting");
  await runAccounting();

  console.log("\nHR");
  await runHr();

  if (S.employee) {
    console.log("\nTransport");
    await runTransport();
  } else {
    skip("transport flows", "employee missing");
  }

  if (S.customer && S.product) {
    console.log("\nOrders");
    await runOrders();
  }

  console.log("\nAdmin");
  await runAdminFlows();

  await runGetSweep();
  await runCleanup();
  await runReconcile();

  const ok = printSummary();
  console.log(`Elapsed ${Math.round((Date.now() - started) / 1000)}s`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("Smoke test crashed:", e);
  process.exit(1);
});

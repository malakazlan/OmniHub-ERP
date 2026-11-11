/**
 * Load a realistic demo dataset for Omni Hub through the public API.
 *
 * Everything goes through the same route handlers users hit, so stock,
 * ledger postings, document numbers and payment status are produced by
 * production code rather than inserted by hand.
 *
 * Usage:
 *   node scripts/demo-data.mjs                 # against http://localhost:3000
 *   BASE_URL=https://omnihub.example.com node scripts/demo-data.mjs
 *
 * Requires ADMIN_EMAIL / ADMIN_PASSWORD in .env (the seeded administrator).
 * Re-runnable: master records (companies, items, employees, vehicles, expense
 * categories) are matched by name and reused. Transactions are only loaded
 * when none exist yet, unless DEMO_FORCE=1.
 */
import "dotenv/config";

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  process.exit(1);
}

// Deterministic pseudo-random so the dataset is the same on every run.
let seed = 20261110;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const money = (n) => Math.round(n * 100) / 100;

const today = new Date();
const daysAgo = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

let cookie = "";
async function api(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "content-type": "application/json", cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${json.error || json.raw || text.slice(0, 200)}`);
  }
  return json;
}

const CUSTOMERS = [
  ["Cedar Valley Plumbing", "Eugene", "OR"],
  ["Bayline Electrical Co.", "Oakland", "CA"],
  ["Mount Hood Builders", "Gresham", "OR"],
  ["Puget Sound Facilities", "Everett", "WA"],
  ["Silver Creek Contractors", "Reno", "NV"],
  ["Redstone Mechanical", "Boise", "ID"],
  ["Pacific Crest Irrigation", "Bend", "OR"],
  ["Northstar Property Services", "Spokane", "WA"],
  ["Golden State Fire Protection", "Sacramento", "CA"],
  ["Evergreen Marine Repair", "Bellingham", "WA"],
  ["Summit Plumbing Supply", "Portland", "OR"],
  ["Ridgeview Builders", "Seattle", "WA"],
  ["Cascade Hardware", "Portland", "OR"],
  ["Blue Heron Mechanical", "Boise", "ID"],
  ["Pioneer Irrigation", "Boise", "ID"],
  ["Harbor City Contractors", "Seattle", "WA"],
  ["Tidewater Marine Services", "Tacoma", "WA"],
  ["Northgate Property Group", "Sacramento", "CA"],
  ["Westfield Facilities", "Denver", "CO"],
  ["Granite Peak Construction", "Salt Lake City", "UT"],
];

const VENDORS = [
  ["Columbia Copper Works", "Portland", "OR"],
  ["Sierra Tool & Die", "Reno", "NV"],
  ["Westcoast Lighting Supply", "Los Angeles", "CA"],
  ["Cascade Hardware Imports", "Tacoma", "WA"],
  ["Pacific Fasteners Inc.", "Oakland", "CA"],
  ["Kessler Metals", "Denver", "CO"],
  ["Evergreen Pipe & Fitting", "Tacoma", "WA"],
  ["Aurora Electrical Distributors", "Phoenix", "AZ"],
  ["Redwood Safety Products", "Sacramento", "CA"],
  ["Lakeside Packaging Co.", "Boise", "ID"],
];

const ITEMS = [
  // name, category, unit, cost, price, units per case
  ['3/4" Brass Ball Valve, FNPT', "Plumbing", "ea", 11.2, 18.4, 12],
  ['1/2" PEX-A Tubing, 300 ft Roll, Red', "Plumbing", "roll", 58.0, 96.0, 1],
  ['1" Copper 90° Elbow', "Plumbing", "ea", 2.6, 4.55, 50],
  ['1/2" Copper Tee', "Plumbing", "ea", 1.9, 3.35, 50],
  ["12-2 NM-B Romex, 250 ft", "Electrical", "roll", 74.0, 118.0, 1],
  ["20A GFCI Receptacle, White", "Electrical", "ea", 9.4, 15.9, 10],
  ['4" Square Junction Box, Steel', "Electrical", "ea", 1.45, 2.6, 50],
  ['LED Shop Light, 4 ft, 5000K', "Electrical", "ea", 19.5, 34.0, 6],
  ['#10 x 2" Deck Screws, Coated', "Fasteners", "lb", 3.1, 5.4, 25],
  ['3/8" x 3" Lag Bolt, Galvanized', "Fasteners", "ea", 0.42, 0.79, 100],
  ['1/4" Hex Nut, Zinc', "Fasteners", "ea", 0.05, 0.11, 500],
  ["16 oz Claw Hammer, Fiberglass", "Tools", "ea", 12.8, 22.5, 6],
  ["25 ft Tape Measure", "Tools", "ea", 8.1, 14.95, 12],
  ['7-1/4" Circular Saw Blade, 24T', "Tools", "ea", 9.9, 17.5, 10],
  ["Nitrile Gloves, L, 100 ct", "Safety", "case", 6.4, 11.9, 10],
  ["Safety Glasses, Clear", "Safety", "ea", 1.3, 2.75, 12],
  ["Hard Hat, Type I, White", "Safety", "ea", 7.9, 14.2, 12],
  ['Stretch Wrap 18" x 1500 ft', "Packaging", "roll", 14.0, 24.5, 4],
  ['Shipping Carton 18x18x16"', "Packaging", "ea", 1.15, 2.1, 25],
  ['Packing Tape 2" x 110 yd', "Packaging", "roll", 1.6, 2.95, 36],
  ['3/4" PVC Schedule 40 Pipe, 10 ft', "Plumbing", "ea", 3.4, 5.95, 10],
  ['Brass Compression Fitting 1/2"', "Plumbing", "ea", 2.1, 3.85, 50],
  ["Kitchen Faucet, Single Handle, Chrome", "Plumbing", "ea", 38.0, 69.0, 4],
  ["Water Heater Element 4500W", "Plumbing", "ea", 9.5, 16.9, 12],
  ["14-2 NM-B Romex, 250 ft", "Electrical", "roll", 52.0, 86.0, 1],
  ['1/2" EMT Conduit, 10 ft', "Electrical", "ea", 4.2, 7.25, 10],
  ["Single-Pole Light Switch, White", "Electrical", "ea", 1.1, 2.15, 10],
  ["LED Recessed Downlight 6 in", "Electrical", "ea", 11.0, 19.5, 6],
  ['Drywall Screws #6 x 1-5/8"', "Fasteners", "lb", 2.4, 4.2, 25],
  ['Carriage Bolt 1/2" x 6"', "Fasteners", "ea", 0.9, 1.65, 50],
  ["Concrete Anchors, Wedge 3/8", "Fasteners", "ea", 0.65, 1.2, 50],
  ["Cordless Drill Driver 20V", "Tools", "ea", 64.0, 109.0, 2],
  ["Adjustable Wrench 10 in", "Tools", "ea", 7.8, 13.5, 12],
  ["Utility Knife, Retractable", "Tools", "ea", 3.2, 5.95, 12],
  ["Cut-Resistant Gloves, M", "Safety", "ea", 2.6, 4.95, 12],
  ["Hi-Vis Safety Vest, L", "Safety", "ea", 4.1, 7.5, 12],
  ["Ear Plugs, 200 pair", "Safety", "case", 11.0, 19.0, 4],
  ["Bubble Wrap 12 in x 175 ft", "Packaging", "roll", 9.8, 16.9, 4],
  ['Shipping Carton 12x12x12"', "Packaging", "ea", 0.72, 1.35, 25],
  ["Pallet Corner Boards, 48 in", "Packaging", "ea", 1.9, 3.25, 50],
];

const EMPLOYEES = [
  ["Jordan Miles", "Controller", "Finance", "accountant", 7900],
  ["Ana Reyes", "Account Executive", "Sales", "salesperson", 5600],
  ["Tasha Lee", "Account Executive", "Sales", "salesperson", 5400],
  ["Marcus Okafor", "Inside Sales", "Sales", "salesperson", 4800],
  ["Dev Kapoor", "Warehouse Lead", "Operations", "warehouse", 4600],
  ["Elena Novak", "Purchasing Manager", "Operations", "manager", 6800],
  ["Luis Herrera", "Driver", "Logistics", "driver", 4300],
  ["Sam Whitaker", "Driver", "Logistics", "driver", 4300],
  ["Priya Natarajan", "Accounts Payable Specialist", "Finance", "accountant", 5100],
  ["Caleb Ortiz", "Warehouse Associate", "Operations", "warehouse", 3900],
  ["Hannah Berg", "Customer Service Rep", "Sales", "salesperson", 4200],
  ["Omar Haddad", "Driver", "Logistics", "driver", 4300],
];

const VEHICLES = [
  ["TRK-01", "Box Truck", "Isuzu", "NPR-HD", 2022, 7000, "Luis Herrera"],
  ["TRK-02", "Box Truck", "Freightliner", "M2 106", 2021, 12000, "Sam Whitaker"],
  ["VAN-03", "Cargo Van", "Ford", "Transit 250", 2023, 3500, null],
  ["TRK-04", "Flatbed", "Hino", "268A", 2020, 15000, null],
  ["TRK-05", "Box Truck", "Isuzu", "NQR", 2024, 9000, "Omar Haddad"],
  ["VAN-06", "Cargo Van", "Ram", "ProMaster 2500", 2022, 3800, null],
];

const EXPENSE_CATEGORIES = ["Rent", "Utilities", "Fuel", "Insurance", "Software", "Office Supplies", "Repairs & Maintenance"];
const EXPENSES = [
  ["Warehouse lease, Portland A", "Rent", 8500],
  ["Warehouse lease, Seattle", "Rent", 6200],
  ["Electric and water", "Utilities", 1340],
  ["Fleet fuel", "Fuel", 2180],
  ["General liability premium", "Insurance", 1975],
  ["ERP and email subscriptions", "Software", 640],
  ["Forklift service", "Repairs & Maintenance", 890],
  ["Printer paper and labels", "Office Supplies", 215],
  ["Warehouse lease, Boise", "Rent", 4100],
  ["Internet and phones", "Utilities", 520],
  ["Vehicle insurance", "Insurance", 1460],
];

async function main() {
  console.log(`Loading demo data into ${BASE_URL} ...`);
  await api("POST", "/api/auth/login", { email: EMAIL, password: PASSWORD });

  // Opening capital so cash & bank start positive: Dr Operating Checking / Cr Owner's Equity.
  const generalAccounts = (await api("GET", "/api/accounts?category=general")).accounts || [];
  let equity = generalAccounts.find((a) => a.name === "Owner's Equity");
  if (!equity) {
    equity = (await api("POST", "/api/accounts", { name: "Owner's Equity", type: "equity", category: "general" })).account;
  }
  const journals = (await api("GET", "/api/journal")).entries || [];
  const bankForCapital = ((await api("GET", "/api/accounts?category=bank")).accounts || []).find((a) => a.code === "ACC-BANK");
  if (bankForCapital && !journals.some((j) => j.description === "Opening capital contribution")) {
    await api("POST", "/api/journal", {
      entryDate: daysAgo(185),
      description: "Opening capital contribution",
      lines: [
        { accountId: bankForCapital.id, debit: 400000, credit: 0, description: "Initial deposit" },
        { accountId: equity.id, debit: 0, credit: 400000, description: "Owner contribution" },
      ],
    });
    console.log("  opening capital posted");
  }

  // Each transaction phase runs only when that register is still empty (or DEMO_FORCE=1),
  // so an interrupted load can be resumed without duplicating earlier phases.
  const force = process.env.DEMO_FORCE === "1";
  const existingPurchases = (await api("GET", "/api/purchases")).purchases || [];
  const existingSales = (await api("GET", "/api/sales")).sales || [];
  const existingPayments = (await api("GET", "/api/payments")).payments || [];
  const existingExpenses = (await api("GET", "/api/expenses")).expenses || [];
  const existingTrips = (await api("GET", "/api/transport")).transports || [];
  const INVOICE_TARGET = 160;
  const PO_TARGET = 48;

  const byName = (list, key = "name") => new Map((list || []).map((x) => [x[key], x]));
  const existingCompanies = byName((await api("GET", "/api/companies")).companies);
  const existingProducts = byName((await api("GET", "/api/products")).products);
  const existingEmployees = byName((await api("GET", "/api/hr/employees")).employees);
  const existingVehicles = byName((await api("GET", "/api/transport/vehicles")).vehicles, "registrationNumber");
  const existingExpenseCats = byName((await api("GET", "/api/expenses/categories")).categories);

  const accounts = await api("GET", "/api/accounts?category=bank");
  const bank = (accounts.accounts || []).find((a) => a.code === "ACC-BANK") || (accounts.accounts || [])[0];
  if (!bank) throw new Error("No bank ledger account found. Run npm run db:seed first.");
  const bankAccountId = bank.id;

  // Customers and vendors
  const customers = [];
  for (const [name, city, state] of CUSTOMERS) {
    if (existingCompanies.has(name)) {
      customers.push(existingCompanies.get(name));
      continue;
    }
    const r = await api("POST", "/api/companies", {
      fromDirectory: true,
      name,
      companyType: "buyer",
      contactPerson: pick(["Dana Brooks", "Chris Patel", "Morgan Yu", "Riley Chen", "Alex Romero"]),
      phone: `(${between(206, 971)}) 555-0${between(100, 199)}`,
      email: `ap@${name.toLowerCase().replace(/[^a-z]+/g, "")}.com`,
      city,
      address: `${between(100, 9800)} ${pick(["Industrial Way", "Commerce Dr", "Harbor Blvd", "Market St", "Mill Rd"])}, ${city}, ${state}`,
      creditLimit: pick([25000, 50000, 75000, 100000]),
    });
    customers.push(r.company);
  }
  const vendors = [];
  for (const [name, city, state] of VENDORS) {
    if (existingCompanies.has(name)) {
      vendors.push(existingCompanies.get(name));
      continue;
    }
    const r = await api("POST", "/api/companies", {
      fromDirectory: true,
      name,
      companyType: "supplier",
      contactPerson: pick(["Pat Nguyen", "Jamie Fox", "Taylor Kim", "Sydney Walsh"]),
      phone: `(${between(206, 971)}) 555-0${between(100, 199)}`,
      email: `orders@${name.toLowerCase().replace(/[^a-z]+/g, "")}.com`,
      city,
      address: `${between(100, 9800)} ${pick(["Distribution Ct", "Freight Ave", "Depot St", "Logistics Pkwy"])}, ${city}, ${state}`,
    });
    vendors.push(r.company);
  }
  console.log(`  ${customers.length} customers, ${vendors.length} vendors`);

  // Items
  const cats = await api("GET", "/api/products/categories");
  const catId = (name) => (cats.categories || []).find((c) => c.name === name)?.id;
  const items = [];
  for (const [name, category, unit, cost, price, perCase] of ITEMS) {
    if (existingProducts.has(name)) {
      items.push({ ...existingProducts.get(name), cost, price, unit, bagWeight: perCase });
      continue;
    }
    const r = await api("POST", "/api/products", {
      name,
      categoryId: catId(category),
      unit,
      bagWeight: perCase,
      costPrice: cost,
      salePrice: price,
      minimumStock: between(20, 120),
      currentStock: 0,
    });
    items.push({ ...r.product, cost, price, unit, bagWeight: perCase });
  }
  console.log(`  ${items.length} items`);

  // Employees and vehicles
  for (const [name, designation, department, role, salary] of EMPLOYEES) {
    if (existingEmployees.has(name)) continue;
    await api("POST", "/api/hr/employees", {
      name,
      phone: `(503) 555-0${between(100, 199)}`,
      role,
      designation,
      department,
      salary,
      joiningDate: daysAgo(between(200, 1400)),
      createLogin: false,
      createCashAccount: false,
    });
  }
  for (const [reg, type, make, model, year, capacity, driver] of VEHICLES) {
    if (existingVehicles.has(reg)) continue;
    await api("POST", "/api/transport/vehicles", {
      registrationNumber: reg,
      vehicleType: type,
      make,
      model,
      year,
      capacity,
      driverName: driver,
      isOwned: true,
    });
  }
  console.log(`  ${EMPLOYEES.length} employees, ${VEHICLES.length} vehicles`);

  // Expense categories
  const expenseCats = {};
  for (const name of EXPENSE_CATEGORIES) {
    if (existingExpenseCats.has(name)) {
      expenseCats[name] = existingExpenseCats.get(name).id;
      continue;
    }
    const r = await api("POST", "/api/expenses/categories", { name });
    expenseCats[name] = r.category.id;
  }

  // Purchase orders: 3 months of receiving, oldest first so stock exists before sales
  let poCount = 0;
  for (let day = 180; day >= 2 && (force || poCount + existingPurchases.length < PO_TARGET); day -= between(3, 5)) {
    const vendor = pick(vendors);
    const lines = Array.from({ length: between(2, 5) }, () => pick(items)).map((it) => ({
      productId: it.id,
      productName: it.name,
      quantity: it.bagWeight * between(4, 20),
      unit: it.unit,
      rate: money(it.cost * (0.95 + rnd() * 0.1)),
    }));
    const total = lines.reduce((s, l) => s + l.quantity * l.rate, 0);
    const paidNow = rnd() < 0.55 ? money(total) : rnd() < 0.5 ? money(total * 0.5) : 0;
    await api("POST", "/api/purchases", {
      companyId: vendor.id,
      vendorName: vendor.name,
      purchaseDate: daysAgo(day),
      status: "received",
      items: lines,
      transportCost: pick([0, 0, 120, 240, 380]),
      bankAmount: paidNow,
      bankAccountId: paidNow > 0 ? bankAccountId : undefined,
      notes: pick(["", "", "Dock 2", "Partial pallet, balance to follow"]),
    });
    poCount += 1;
  }
  console.log(`  ${poCount} purchase orders received`);

  // Invoices: more frequent, spread across customers and reps
  let invCount = existingSales.length;
  for (let day = 176; day >= 0 && (force || invCount < INVOICE_TARGET); day -= between(1, 2)) {
    const customer = pick(customers);
    const lines = Array.from({ length: between(1, 5) }, () => pick(items)).map((it) => ({
      productId: it.id,
      productName: it.name,
      quantity: it.bagWeight * between(1, 4),
      unit: it.unit,
      rate: money(it.price * (0.97 + rnd() * 0.06)),
    }));
    const total = lines.reduce((s, l) => s + l.quantity * l.rate, 0);
    const paidNow = rnd() < 0.3 ? money(total) : 0;
    try {
      await api("POST", "/api/sales", {
        customerType: "company",
        companyId: customer.id,
        customerName: customer.name,
        saleDate: daysAgo(day),
        status: day > 1 ? "delivered" : "confirmed",
        items: lines,
        transportCost: pick([0, 0, 0, 85, 150]),
        bankAmount: paidNow,
        bankAccountId: paidNow > 0 ? bankAccountId : undefined,
      });
      invCount += 1;
    } catch (e) {
      if (!/stock/i.test(e.message)) throw e;
    }
  }
  console.log(`  ${invCount} invoices`);

  // Customer payments against open balances (FIFO settlement happens server-side)
  let payCount = 0;
  const refreshed = await api("GET", "/api/companies");
  for (const c of force || existingPayments.length === 0 ? refreshed.companies || [] : []) {
    const balance = Number(c.balance) || 0;
    if (c.companyType === "buyer" && balance > 500 && rnd() < 0.7) {
      const amount = money(rnd() < 0.5 ? balance : balance * (0.3 + rnd() * 0.5));
      await api("POST", "/api/payments", {
        mode: "receive",
        partyAccountId: c.accountId,
        bankAmount: amount,
        bankAccountId,
        paymentDate: daysAgo(between(0, 20)),
        paymentMethod: pick(["bank_transfer", "cheque", "online"]),
        description: `Payment received from ${c.name}`,
      });
      payCount += 1;
    }
    if (c.companyType === "supplier" && balance < -500 && rnd() < 0.6) {
      const owed = -balance;
      const amount = money(rnd() < 0.5 ? owed : owed * 0.5);
      await api("POST", "/api/payments", {
        mode: "pay",
        partyAccountId: c.accountId,
        bankAmount: amount,
        bankAccountId,
        paymentDate: daysAgo(between(0, 15)),
        paymentMethod: "bank_transfer",
        description: `Bill payment to ${c.name}`,
      });
      payCount += 1;
    }
  }
  console.log(`  ${payCount} payments`);

  // Monthly operating expenses for the last three months
  let expCount = 0;
  for (const monthOffset of force || existingExpenses.length === 0 ? [5, 4, 3, 2, 1, 0] : []) {
    for (const [title, category, amount] of EXPENSES) {
      await api("POST", "/api/expenses", {
        expenseDate: daysAgo(monthOffset * 30 + between(1, 6)),
        expenseTitle: title,
        categoryId: expenseCats[category],
        bankAmount: money(amount * (0.95 + rnd() * 0.1)),
        bankAccountId,
        description: title,
      });
      expCount += 1;
    }
  }
  console.log(`  ${expCount} expenses`);

  // Deliveries
  const vehicles = (await api("GET", "/api/transport/vehicles")).vehicles || [];
  let tripCount = 0;
  for (let day = 150; day >= 0 && (force || existingTrips.length === 0); day -= between(2, 4)) {
    const v = pick(vehicles);
    const customer = pick(customers);
    await api("POST", "/api/transport", {
      vehicleId: v.id,
      vehicleNumber: v.registrationNumber,
      driverName: v.driverName || "Luis Herrera",
      originCity: "Portland",
      destinationCity: customer.city,
      destinationAddress: customer.address,
      loadWeight: between(800, 6500),
      loadDescription: `Delivery to ${customer.name}`,
      freightCharges: pick([0, 150, 225, 340]),
      status: day > 1 ? "delivered" : "in_transit",
      dispatchDate: daysAgo(day),
      deliveryDate: day > 1 ? daysAgo(day - 1) : undefined,
    });
    tripCount += 1;
  }
  console.log(`  ${tripCount} deliveries`);

  // Sales orders (customer order queue): some pending, some accepted
  const existingOrders = (await api("GET", "/api/orders")).orders || [];
  let orderCount = 0;
  if (force || existingOrders.length === 0) {
    for (let i = 0; i < 8; i += 1) {
      const customer = pick(customers);
      const lines = Array.from({ length: between(1, 4) }, () => pick(items)).map((it) => ({
        productId: it.id,
        productName: it.name,
        quantity: it.bagWeight * between(1, 3),
        unit: it.unit,
        rate: it.price,
      }));
      const r = await api("POST", "/api/orders", {
        customerName: customer.name,
        companyId: customer.id,
        orderDate: daysAgo(between(0, 6)),
        items: lines,
        notes: pick(["", "Call before delivery", "Dock B after 2pm", ""]),
      });
      if (i % 2 === 0) await api("POST", `/api/orders/${r.order.id}`, { action: "accept" });
      orderCount += 1;
    }
  }
  console.log(`  ${orderCount} sales orders`);

  // A few sale returns against delivered invoices (only on a first load)
  let returnCount = 0;
  if (force || existingSales.length === 0) {
    const delivered = (await api("GET", "/api/sales?status=delivered")).sales || [];
    for (const sale of delivered.filter((s) => (s.items || []).length > 0).slice(0, 4)) {
      const item = sale.items[0];
      const qty = Math.max(1, Math.floor(item.quantity / 4));
      await api("POST", `/api/sales/${sale.id}/returns`, {
        items: [{ productId: item.productId, productName: item.productName, quantity: qty, unit: item.unit, rate: item.rate }],
        reason: pick(["Damaged in transit", "Over-shipped", "Wrong item"]),
      });
      returnCount += 1;
    }
  }
  console.log(`  ${returnCount} sale returns`);

  // Attendance for the last six working weeks
  const employees = (await api("GET", "/api/hr/employees")).employees || [];
  const existingAttendance = (await api("GET", "/api/hr/attendance")).attendance || [];
  let attendanceDays = 0;
  if (force || existingAttendance.length === 0) {
    for (let day = 42; day >= 0; day -= 1) {
      const d = new Date(today);
      d.setDate(d.getDate() - day);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const date = d.toISOString().slice(0, 10);
      const records = employees.map((e) => ({
        employeeId: e.id,
        date,
        status: rnd() < 0.92 ? "present" : rnd() < 0.5 ? "absent" : rnd() < 0.5 ? "half_day" : "leave",
      }));
      await api("POST", "/api/hr/attendance", { records });
      attendanceDays += 1;
    }
  }
  console.log(`  ${attendanceDays} attendance days`);

  // Payroll for the previous two months, paid from the bank
  const existingSalaries = (await api("GET", "/api/hr/salary")).salaryRecords || [];
  let payrollCount = 0;
  if (force || existingSalaries.length === 0) {
    for (const monthsBack of [2, 1]) {
      const d = new Date(today);
      d.setMonth(d.getMonth() - monthsBack, 1);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const payDay = new Date(year, month, 0);
      for (const e of employees) {
        await api("POST", "/api/hr/salary", {
          employeeId: e.id,
          month,
          year,
          baseSalary: e.salary,
          deductions: 0,
          bonus: rnd() < 0.2 ? 150 : 0,
          salaryBankAmount: e.salary,
          bankAccountId,
          paymentDate: payDay.toISOString().slice(0, 10),
          paymentMethod: "bank_transfer",
        });
        payrollCount += 1;
      }
    }
  }
  console.log(`  ${payrollCount} payroll records`);

  // Two outstanding salary advances
  const existingAdvances = (await api("GET", "/api/hr/advances")).advances || [];
  let advanceCount = 0;
  if (force || existingAdvances.length === 0) {
    for (const e of employees.slice(0, 2)) {
      await api("POST", "/api/hr/advances", {
        employeeId: e.id,
        advanceDate: daysAgo(between(3, 12)),
        bankAmount: 300,
        bankAccountId,
        notes: "Mid-month advance",
      });
      advanceCount += 1;
    }
  }
  console.log(`  ${advanceCount} salary advances`);

  // Vehicle running costs
  const existingVehicleExpenses = (await api("GET", "/api/transport/vehicle-expenses")).expenses || [];
  let vehicleExpenseCount = 0;
  if (force || existingVehicleExpenses.length === 0) {
    for (const v of vehicles) {
      for (const [type, amount] of [["fuel", between(180, 420)], ["maintenance", between(120, 600)], ["fuel", between(180, 420)]]) {
        await api("POST", "/api/transport/vehicle-expenses", {
          vehicleId: v.id,
          expenseDate: daysAgo(between(1, 60)),
          expenseType: type,
          amount,
          accountId: bankAccountId,
          description: `${type === "fuel" ? "Diesel" : "Service"} ${v.registrationNumber}`,
        });
        vehicleExpenseCount += 1;
      }
    }
  }
  console.log(`  ${vehicleExpenseCount} vehicle expenses`);

  console.log("Demo data loaded.");
}

main().catch((e) => {
  console.error("Demo data failed:", e.message);
  process.exit(1);
});

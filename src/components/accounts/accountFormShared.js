"use client";

import React from "react";
import { balanceToFormAmount } from "@/lib/accountBalanceForm";
import { VEHICLE_TYPES } from "@/components/fleet/fleetConstants";

export const CATEGORY_TITLES = {
  cash: "Cash Account",
  bank: "Bank Account",
  farmer: "Farmer / Supplier",
  company: "Company",
  shop: "Shop / Customer",
  salary: "Employee",
  transport: "Driver Account",
  vehicle: "Vehicle Account",
};

export const OPENING_HINT = {
  cash: "Cash in hand at start (optional).",
  bank: "Current bank balance (optional).",
  farmer: "Amount payable to this farmer (optional).",
  company: "Opening balance — payable for suppliers, receivable for buyers (optional).",
  shop: "Amount this customer owes you (optional).",
  salary: "Salary payable opening balance (optional).",
  transport: "Opening driver payable balance (optional).",
  vehicle: "Opening balance for this vehicle account (optional).",
};

const EMP_ROLES = ["salesperson", "accountant", "laborer", "officer", "manager"];

export function FormSection({ title, hint, children, optional }) {
  return (
    <section className="rounded-xl border border-slate-200/90 bg-slate-50/40 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-200/80 bg-white/80">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">{title}</p>
        {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
        {optional && <p className="text-[10px] text-slate-400 mt-0.5">All fields below are optional.</p>}
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </section>
  );
}

export function Field({ label, required, children, hint }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

export function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

export function openingBalanceDateFromEntries(entries) {
  const opening = (entries || []).find(
    (e) => e.referenceType === "OpeningBalance" || e.description === "Opening balance"
  );
  if (!opening?.date) return todayInputDate();
  const d = new Date(opening.date);
  if (Number.isNaN(d.getTime())) return todayInputDate();
  return d.toISOString().slice(0, 10);
}

export function OpeningBalanceField({ value, onChange, hint, label = "Opening balance" }) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="number"
        step="0.01"
        value={value ?? ""}
        onChange={onChange}
        className="input-field w-full text-sm tabular-nums"
        placeholder="0"
      />
    </Field>
  );
}

function BalanceField({ isEdit, form, set, openingHint }) {
  if (isEdit) {
    return (
      <>
        <OpeningBalanceField
          label="Current balance"
          value={form.currentBalance ?? ""}
          onChange={(e) => set("currentBalance", e.target.value)}
          hint="Change the account balance. A balance adjustment will be posted to the ledger."
        />
        <Field
          label="Opening balance date"
          hint="Move the opening balance entry to this date in the ledger (start of day)."
        >
          <input
            type="date"
            value={form.openingBalanceDate ?? ""}
            onChange={(e) => set("openingBalanceDate", e.target.value)}
            className="input-field w-full text-sm"
          />
        </Field>
      </>
    );
  }

  return (
    <>
      <OpeningBalanceField
        label="Opening balance"
        value={form.openingBalance ?? ""}
        onChange={(e) => set("openingBalance", e.target.value)}
        hint={openingHint}
      />
      <Field
        label="As of date"
        hint="Opening balance appears in the ledger on this date (sorted with other entries)."
      >
        <input
          type="date"
          value={form.openingBalanceDate ?? todayInputDate()}
          onChange={(e) => set("openingBalanceDate", e.target.value)}
          className="input-field w-full text-sm"
        />
      </Field>
    </>
  );
}

export function validateAccountForm(category, form) {
  const phone = form.phone?.trim();
  switch (category) {
    case "cash":
      if (!form.name?.trim()) return "Account name is required";
      if (!phone) return "Phone is required";
      break;
    case "bank": {
      const name = form.accountTitle?.trim() || form.ledgerName?.trim() || form.bankName?.trim();
      if (!name) return "Account name is required";
      if (!phone) return "Phone is required";
      break;
    }
    case "farmer":
    case "shop":
    case "salary":
      if (!form.name?.trim()) return "Name is required";
      if (!phone) return "Phone is required";
      break;
    case "company":
      if (!form.name?.trim()) return "Company name is required";
      if (!phone) return "Phone is required";
      break;
    case "transport":
      if (!form.name?.trim()) return "Driver name is required";
      if (!phone) return "Phone is required";
      break;
    case "vehicle":
      if (!form.registrationNumber?.trim()) return "Registration number is required";
      if (!form.vehicleType?.trim()) return "Vehicle type is required";
      if (!form.driverPhone?.trim()) return "Driver phone is required";
      break;
    default:
      break;
  }
  return null;
}

export function AccountCategoryFields({
  category,
  form,
  setForm,
  setField,
  mode = "create",
  users = [],
  dealers = [],
  accountMeta = null,
  loginFields = null,
}) {
  const isEdit = mode === "edit";
  const set = setField || ((key, val) => setForm((f) => ({ ...f, [key]: val })));
  const input = (props) => (
    <input className="input-field w-full text-sm" value={props.value ?? ""} {...props} />
  );
  const openingHint = OPENING_HINT[category];

  if (category === "cash") {
    return (
      <>
        <FormSection title="Account details" hint="Petty cash or office till">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Field label="Account name" required>
                {input({ value: form.name, onChange: (e) => set("name", e.target.value), placeholder: "e.g. Main Office Cash" })}
              </Field>
            </div>
            <Field label="Phone" required>
              {input({ value: form.phone, onChange: (e) => set("phone", e.target.value), placeholder: "03xx-xxxxxxx" })}
            </Field>
            <BalanceField isEdit={isEdit} form={form} set={set} openingHint={openingHint} />
          </div>
        </FormSection>
        <FormSection title="Assignment" optional>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.assignToAdmin} onChange={(e) => setForm({ ...form, assignToAdmin: e.target.checked, assignToUserId: "" })} />
            Assign to admin (main office cash)
          </label>
          {!form.assignToAdmin && (
            <Field label="Assign to user">
              <select className="input-field w-full text-sm" value={form.assignToUserId} onChange={(e) => set("assignToUserId", e.target.value)}>
                <option value="">Office pool</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
              </select>
            </Field>
          )}
        </FormSection>
      </>
    );
  }

  if (category === "bank") {
    return (
      <>
        <FormSection title="Primary details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Field label="Account name" required hint="Shown in ledgers and payment screens">
                {input({ value: form.accountTitle, onChange: (e) => set("accountTitle", e.target.value), placeholder: "e.g. HBL — Current Account" })}
              </Field>
            </div>
            <Field label="Phone" required>
              {input({ value: form.phone, onChange: (e) => set("phone", e.target.value), placeholder: "Branch / contact number" })}
            </Field>
            <BalanceField isEdit={isEdit} form={form} set={set} openingHint={openingHint} />
          </div>
        </FormSection>
        <FormSection title="Bank details" optional>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Bank name">{input({ value: form.bankName, onChange: (e) => set("bankName", e.target.value) })}</Field>
            <Field label="Account number">{input({ value: form.accountNumber, onChange: (e) => set("accountNumber", e.target.value) })}</Field>
            <Field label="Branch code">{input({ value: form.branchCode, onChange: (e) => set("branchCode", e.target.value) })}</Field>
            <Field label="Branch name">{input({ value: form.branchName, onChange: (e) => set("branchName", e.target.value) })}</Field>
          </div>
        </FormSection>
      </>
    );
  }

  if (category === "farmer") {
    return (
      <>
        <FormSection title="Farmer details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Field label="Farmer name" required>{input({ value: form.name, onChange: (e) => set("name", e.target.value) })}</Field>
            </div>
            <Field label="Phone" required>{input({ value: form.phone, onChange: (e) => set("phone", e.target.value) })}</Field>
            <BalanceField isEdit={isEdit} form={form} set={set} openingHint={openingHint} />
          </div>
        </FormSection>
        <FormSection title="Additional information" optional>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="City">{input({ value: form.city, onChange: (e) => set("city", e.target.value) })}</Field>
            <Field label="Village">{input({ value: form.village, onChange: (e) => set("village", e.target.value) })}</Field>
            <Field label="CNIC (optional)">{input({ value: form.cnic, onChange: (e) => set("cnic", e.target.value), placeholder: "Leave blank if unknown" })}</Field>
            <Field label="Father name">{input({ value: form.fatherName, onChange: (e) => set("fatherName", e.target.value) })}</Field>
            <Field label="WhatsApp">{input({ value: form.whatsappNumber, onChange: (e) => set("whatsappNumber", e.target.value) })}</Field>
            <div className="sm:col-span-2">
              <Field label="Address">
                <textarea className="input-field w-full text-sm min-h-[72px] resize-y" value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
              </Field>
            </div>
          </div>
        </FormSection>
      </>
    );
  }

  if (category === "company") {
    return (
      <>
        <FormSection title="Company details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Field label="Company name" required hint="Legal or trading name — used on invoices and ledger">
                {input({ value: form.name, onChange: (e) => set("name", e.target.value), placeholder: "e.g. Al-Fatah Feeds Pvt Ltd" })}
              </Field>
            </div>
            <Field label="Contact person name" hint="Primary contact at this company (optional)">
              {input({ value: form.contactPerson, onChange: (e) => set("contactPerson", e.target.value), placeholder: "e.g. Ahmad Khan" })}
            </Field>
            <Field label="Phone" required>
              {input({ value: form.phone, onChange: (e) => set("phone", e.target.value), placeholder: "03xx-xxxxxxx" })}
            </Field>
            <Field label="Company type">
              <select className="input-field w-full text-sm" value={form.companyType} onChange={(e) => set("companyType", e.target.value)}>
                <option value="supplier">Supplier (we purchase from them)</option>
                <option value="buyer">Buyer (they purchase from us)</option>
                <option value="both">Both supplier & buyer</option>
              </select>
            </Field>
            <BalanceField isEdit={isEdit} form={form} set={set} openingHint={openingHint} />
          </div>
        </FormSection>
        <FormSection title="Additional information" optional>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="City">{input({ value: form.city, onChange: (e) => set("city", e.target.value) })}</Field>
            <Field label="Email">{input({ type: "email", value: form.email, onChange: (e) => set("email", e.target.value) })}</Field>
            <Field label="NTN">{input({ value: form.ntn, onChange: (e) => set("ntn", e.target.value) })}</Field>
            <Field label="STRN">{input({ value: form.strn, onChange: (e) => set("strn", e.target.value) })}</Field>
            <Field label="WhatsApp">{input({ value: form.whatsappNumber, onChange: (e) => set("whatsappNumber", e.target.value) })}</Field>
            <div className="sm:col-span-2">
              <Field label="Address">
                <textarea className="input-field w-full text-sm min-h-[72px] resize-y" value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
              </Field>
            </div>
          </div>
        </FormSection>
      </>
    );
  }

  if (category === "shop") {
    return (
      <>
        <FormSection title="Customer details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Field label="Shop / customer name" required>{input({ value: form.name, onChange: (e) => set("name", e.target.value) })}</Field>
            </div>
            <Field label="Phone" required>{input({ value: form.phone, onChange: (e) => set("phone", e.target.value) })}</Field>
            <BalanceField isEdit={isEdit} form={form} set={set} openingHint={openingHint} />
          </div>
        </FormSection>
        <FormSection title="Additional information" optional>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Owner name">{input({ value: form.ownerName, onChange: (e) => set("ownerName", e.target.value) })}</Field>
            <Field label="City">{input({ value: form.city, onChange: (e) => set("city", e.target.value) })}</Field>
            <Field label="Shop type">
              <select className="input-field w-full text-sm" value={form.shopType} onChange={(e) => set("shopType", e.target.value)}>
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="distributor">Distributor</option>
              </select>
            </Field>
            <Field label="Dealer">
              <select className="input-field w-full text-sm" value={form.dealerId ?? ""} onChange={(e) => set("dealerId", e.target.value)}>
                <option value="">No dealer assigned</option>
                {dealers.map((d) => (
                  <option key={d.id} value={String(d.id)}>{d.name}</option>
                ))}
              </select>
            </Field>
            <Field label="WhatsApp">{input({ value: form.whatsappNumber, onChange: (e) => set("whatsappNumber", e.target.value) })}</Field>
            <div className="sm:col-span-2">
              <Field label="Address">
                <textarea className="input-field w-full text-sm min-h-[72px] resize-y" value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
              </Field>
            </div>
          </div>
        </FormSection>
      </>
    );
  }

  if (category === "salary") {
    return (
      <>
        <FormSection title="Employee details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Field label="Employee name" required>{input({ value: form.name, onChange: (e) => set("name", e.target.value), placeholder: "Full name" })}</Field>
            </div>
            <Field label="Phone" required>{input({ value: form.phone, onChange: (e) => set("phone", e.target.value) })}</Field>
            <BalanceField isEdit={isEdit} form={form} set={set} openingHint={openingHint} />
            <Field label="Role">
              <select className="input-field w-full text-sm" value={form.role} onChange={(e) => set("role", e.target.value)}>
                {EMP_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Monthly salary">{input({ type: "number", step: "any", value: form.salary, onChange: (e) => set("salary", e.target.value), placeholder: "0" })}</Field>
          </div>
        </FormSection>
        <FormSection title="Additional information" optional>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Department">{input({ value: form.department, onChange: (e) => set("department", e.target.value) })}</Field>
            <Field label="CNIC (optional)">{input({ value: form.cnic, onChange: (e) => set("cnic", e.target.value), placeholder: "Leave blank if unknown" })}</Field>
          </div>
          {!isEdit && loginFields}
        </FormSection>
      </>
    );
  }

  if (category === "transport") {
    return (
      <>
        <FormSection title="Driver account details" hint="Ledger account for driver payables">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Field label="Driver name" required>{input({ value: form.name, onChange: (e) => set("name", e.target.value), placeholder: "Full name" })}</Field>
            </div>
            <Field label="Phone" required>{input({ value: form.phone, onChange: (e) => set("phone", e.target.value), placeholder: "03xx-xxxxxxx" })}</Field>
            <BalanceField isEdit={isEdit} form={form} set={set} openingHint={openingHint} />
          </div>
        </FormSection>
        <FormSection title="Additional information" optional>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="CNIC (optional)">{input({ value: form.cnic, onChange: (e) => set("cnic", e.target.value), placeholder: "Leave blank if unknown" })}</Field>
            <Field label="Monthly salary">{input({ type: "number", value: form.salary, onChange: (e) => set("salary", e.target.value), placeholder: "0" })}</Field>
          </div>
        </FormSection>
      </>
    );
  }

  if (category === "vehicle") {
    return (
      <>
        <FormSection title="Vehicle details" hint="Fleet vehicle linked to a ledger account">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Registration number" required>
              {input({
                value: form.registrationNumber,
                onChange: (e) => set("registrationNumber", e.target.value),
                placeholder: "e.g. LEA-1234",
              })}
            </Field>
            <Field label="Vehicle type" required>
              <select
                className="input-field w-full text-sm"
                value={form.vehicleType || "truck"}
                onChange={(e) => set("vehicleType", e.target.value)}
              >
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Make">{input({ value: form.make, onChange: (e) => set("make", e.target.value), placeholder: "e.g. Hino" })}</Field>
            <Field label="Model">{input({ value: form.model, onChange: (e) => set("model", e.target.value), placeholder: "e.g. 500" })}</Field>
            <Field label="Year">{input({ type: "number", value: form.year, onChange: (e) => set("year", e.target.value), placeholder: "2020" })}</Field>
            <Field label="Capacity (tons)">{input({ type: "number", step: "0.01", value: form.capacity, onChange: (e) => set("capacity", e.target.value), placeholder: "0" })}</Field>
            <BalanceField isEdit={isEdit} form={form} set={set} openingHint={openingHint} />
            <Field label="Driver name">{input({ value: form.driverName, onChange: (e) => set("driverName", e.target.value), placeholder: "Assigned driver" })}</Field>
            <Field label="Driver phone" required>{input({ value: form.driverPhone, onChange: (e) => set("driverPhone", e.target.value), placeholder: "03xx-xxxxxxx" })}</Field>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isOwned !== false} onChange={(e) => set("isOwned", e.target.checked)} />
                Company owned vehicle
              </label>
            </div>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <textarea className="input-field w-full text-sm min-h-[72px] resize-y" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
              </Field>
            </div>
          </div>
        </FormSection>
      </>
    );
  }

  return null;
}

export function formFromPartyEntity(category, account, partyEntity, bankMeta) {
  const base = { isActive: account?.isActive !== false };
  const currentBalance =
    account?.type != null
      ? String(balanceToFormAmount(account.type, account?.balance ?? 0))
      : "";
  switch (category) {
    case "cash":
      return {
        ...base,
        currentBalance,
        name: account?.name || "",
        phone: account?.phone || "",
        assignToAdmin: false,
        assignToUserId: account?.ownerUserId ? String(account.ownerUserId) : "",
      };
    case "bank":
      return {
        ...base,
        currentBalance,
        accountTitle: account?.name || bankMeta?.accountTitle || "",
        phone: account?.phone || "",
        bankName: bankMeta?.bankName || "",
        accountNumber: bankMeta?.accountNumber || account?.reference || "",
        branchCode: bankMeta?.branchCode || "",
        branchName: bankMeta?.branchName || "",
        ledgerName: "",
      };
    case "farmer":
      return {
        ...base,
        currentBalance,
        name: partyEntity?.name || account?.name?.replace(/\s*\(Farmer\)\s*$/i, "") || "",
        phone: partyEntity?.phone || account?.phone || "",
        city: partyEntity?.city || account?.city || "",
        village: partyEntity?.village || "",
        cnic: partyEntity?.cnic || account?.cnic || "",
        fatherName: partyEntity?.fatherName || "",
        whatsappNumber: partyEntity?.whatsappNumber || account?.whatsappNumber || "",
        address: partyEntity?.address || account?.address || "",
        isActive: partyEntity?.isActive !== false,
      };
    case "company":
      return {
        ...base,
        currentBalance,
        name: partyEntity?.name || "",
        contactPerson: partyEntity?.contactPerson || "",
        phone: partyEntity?.phone || "",
        city: partyEntity?.city || "",
        email: partyEntity?.email || "",
        ntn: partyEntity?.ntn || "",
        strn: partyEntity?.strn || "",
        companyType: partyEntity?.companyType || "both",
        whatsappNumber: partyEntity?.whatsappNumber || "",
        address: partyEntity?.address || "",
        isActive: partyEntity?.isActive !== false,
      };
    case "shop":
      return {
        ...base,
        currentBalance,
        name: partyEntity?.name || "",
        ownerName: partyEntity?.ownerName || "",
        phone: partyEntity?.phone || "",
        city: partyEntity?.city || "",
        shopType: partyEntity?.shopType || "retail",
        dealerId: partyEntity?.dealerId ? String(partyEntity.dealerId) : "",
        whatsappNumber: partyEntity?.whatsappNumber || "",
        address: partyEntity?.address || "",
        isActive: partyEntity?.isActive !== false,
      };
    case "salary":
      return {
        ...base,
        currentBalance,
        name: partyEntity?.name || account?.name?.replace(/\s*\(Salary\)\s*$/i, "") || "",
        phone: partyEntity?.phone || account?.phone || "",
        role: partyEntity?.role || "officer",
        department: partyEntity?.department || "",
        salary: partyEntity?.salary != null ? String(partyEntity.salary) : "",
        cnic: partyEntity?.cnic || "",
        isActive: partyEntity?.isActive !== false,
      };
    case "transport":
      return {
        ...base,
        currentBalance,
        name: partyEntity?.name || account?.name?.replace(/\s*\((Salary|Driver)\)\s*$/i, "") || "",
        phone: partyEntity?.phone || account?.phone || "",
        role: partyEntity?.role || "officer",
        department: partyEntity?.department || "",
        salary: partyEntity?.salary != null ? String(partyEntity.salary) : "",
        cnic: partyEntity?.cnic || "",
        isActive: partyEntity?.isActive !== false,
      };
    case "vehicle":
      return {
        ...base,
        currentBalance,
        registrationNumber: partyEntity?.registrationNumber || account?.reference || "",
        vehicleType: partyEntity?.vehicleType || "truck",
        make: partyEntity?.make || "",
        model: partyEntity?.model || "",
        year: partyEntity?.year != null ? String(partyEntity.year) : "",
        capacity: partyEntity?.capacity != null ? String(partyEntity.capacity) : "",
        driverName: partyEntity?.driverName || "",
        driverPhone: partyEntity?.driverPhone || account?.phone || "",
        isOwned: partyEntity?.isOwned !== false,
        notes: partyEntity?.notes || "",
        isActive: partyEntity?.isActive !== false,
      };
    default:
      return {
        ...base,
        currentBalance,
        name: account?.name || "",
        phone: account?.phone || "",
        city: account?.city || "",
        whatsappNumber: account?.whatsappNumber || "",
        address: account?.address || "",
      };
  }
}

"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { DIRECTORY_POST_FLAG } from "@/components/accounts/DirectoryShell";
import { useDirectoryAdmin } from "@/components/accounts/DirectoryAdminActions";
import EmployeeLoginFields, { emptyLoginFormFields } from "@/components/hr/EmployeeLoginFields";
import { defaultModulesForRole, loginRoleFromEmployeeRole } from "@/lib/modulePresets";

const EMP_ROLES = ["salesperson", "accountant", "laborer", "officer", "manager"];
const VEHICLE_TYPES = ["truck", "pickup", "trailer", "dumper", "van", "other"];

const CATEGORY_TITLES = {
  cash: "Cash Account",
  bank: "Bank Account",
  farmer: "Farmer",
  company: "Company",
  shop: "Shop / Customer",
  salary: "Employee",
  transport: "Transport",
};

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>}
      {children}
    </div>
  );
}

export default function AccountRegisterModal({ isOpen, onClose, category, transportMode = "driver", onSuccess }) {
  const { showToast } = useToast();
  const isAdmin = useDirectoryAdmin();
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(() => getEmptyForm(category, transportMode));

  useEffect(() => {
    if (!isOpen || !isAdmin) return;
    fetch("/api/settings/users")
      .then((r) => r.json())
      .then((d) => setUsers((d.users || []).filter((u) => u.isActive)));
  }, [isOpen, isAdmin]);

  useEffect(() => {
    setForm(getEmptyForm(category, transportMode));
  }, [category, transportMode]);

  if (!isAdmin) return null;

  const title = category === "transport" && transportMode === "vehicle"
    ? "Register Vehicle"
    : `Register ${CATEGORY_TITLES[category] || "Account"}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let res, data;
      switch (category) {
        case "cash":
          res = await fetch("/api/accounts/directory/cash", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: form.name,
              openingBalance: form.openingBalance,
              assignToAdmin: form.assignToAdmin,
              assignToUserId: form.assignToAdmin ? undefined : form.assignToUserId || undefined,
              ...DIRECTORY_POST_FLAG,
            }),
          });
          break;
        case "bank":
          res = await fetch("/api/accounts/directory/bank", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, ...DIRECTORY_POST_FLAG }),
          });
          break;
        case "farmer":
          res = await fetch("/api/farmers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, ...DIRECTORY_POST_FLAG }),
          });
          break;
        case "company":
          res = await fetch("/api/companies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, ...DIRECTORY_POST_FLAG }),
          });
          break;
        case "shop":
          res = await fetch("/api/shops", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, ...DIRECTORY_POST_FLAG }),
          });
          break;
        case "salary":
          res = await fetch("/api/hr/employees", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: form.name,
              phone: form.phone,
              role: form.role,
              department: form.department,
              salary: form.salary,
              cnic: form.cnic,
              isActive: form.isActive,
              createAccount: true,
              createCashAccount: true,
              createLogin: form.createLogin,
              loginEmail: form.createLogin ? form.loginEmail : undefined,
              loginPassword: form.createLogin ? form.loginPassword : undefined,
              loginRole: form.createLogin ? form.loginRole : undefined,
              allowedModules: form.createLogin ? form.allowedModules : undefined,
              assignUserId: form.createLogin ? "" : form.assignUserId,
              ...DIRECTORY_POST_FLAG,
            }),
          });
          break;
        case "transport":
          if (transportMode === "vehicle") {
            res = await fetch("/api/transport/vehicles", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...form, ...DIRECTORY_POST_FLAG }),
            });
          } else {
            res = await fetch("/api/hr/employees", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: form.name,
                phone: form.phone,
                cnic: form.cnic,
                salary: form.salary,
                role: "driver",
                department: "Transport",
                isActive: form.isActive,
                createAccount: true,
                createCashAccount: true,
                ...DIRECTORY_POST_FLAG,
              }),
            });
          }
          break;
        default:
          showToast("Unknown account type", "error");
          return;
      }
      data = await res.json();
      if (res.ok) {
        showToast(`${CATEGORY_TITLES[category] || "Account"} created successfully`, "success");
        onSuccess?.();
        onClose();
      } else {
        showToast(data.error || "Failed to create account", "error");
      }
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const input = ({ value, ...props }) => (
    <input className="input-field w-full text-sm" value={value ?? ""} {...props} />
  );

  const formId = `register-${category}-form`;

  const submitFooter = (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white cursor-pointer">
        Cancel
      </button>
      <Button type="submit" form={formId} disabled={submitting} className="bg-teal-600 border-0 min-w-[120px] px-5 py-2 text-sm">
        {submitting ? "Saving…" : "Create Account"}
      </Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={category === "salary" ? "lg" : "md"} footer={submitFooter}>
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        {category !== "salary" && (
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
            A ledger account is created automatically where applicable.
          </p>
        )}

        {category === "cash" && (
          <>
            <Field label="Account name *">{input({ value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), required: true, placeholder: "e.g. Main Office Cash" })}</Field>
            <Field label="Opening balance">{input({ type: "number", step: "0.01", value: form.openingBalance, onChange: (e) => setForm({ ...form, openingBalance: e.target.value }), placeholder: "0" })}</Field>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.assignToAdmin} onChange={(e) => setForm({ ...form, assignToAdmin: e.target.checked, assignToUserId: "" })} />
              Assign to admin (main office cash)
            </label>
            {!form.assignToAdmin && (
              <Field label="Assign to user">
                <select className="input-field w-full" value={form.assignToUserId} onChange={(e) => setForm({ ...form, assignToUserId: e.target.value })}>
                  <option value="">Office pool (admin/manager/accountant)</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
                </select>
              </Field>
            )}
          </>
        )}

        {category === "bank" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Bank name *">{input({ value: form.bankName, onChange: (e) => setForm({ ...form, bankName: e.target.value }), required: true })}</Field>
            <Field label="Account title *">{input({ value: form.accountTitle, onChange: (e) => setForm({ ...form, accountTitle: e.target.value }), required: true })}</Field>
            <Field label="Account number *">{input({ value: form.accountNumber, onChange: (e) => setForm({ ...form, accountNumber: e.target.value }), required: true })}</Field>
            <Field label="Branch code">{input({ value: form.branchCode, onChange: (e) => setForm({ ...form, branchCode: e.target.value }) })}</Field>
            <Field label="Branch name">{input({ value: form.branchName, onChange: (e) => setForm({ ...form, branchName: e.target.value }) })}</Field>
            <Field label="Ledger display name">{input({ value: form.ledgerName, onChange: (e) => setForm({ ...form, ledgerName: e.target.value }) })}</Field>
            <Field label="Opening balance">{input({ type: "number", step: "0.01", value: form.openingBalance, onChange: (e) => setForm({ ...form, openingBalance: e.target.value }) })}</Field>
          </div>
        )}

        {category === "farmer" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2"><Field label="Farmer name *">{input({ value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), required: true })}</Field></div>
            <Field label="Phone">{input({ value: form.phone, onChange: (e) => setForm({ ...form, phone: e.target.value }) })}</Field>
            <Field label="City">{input({ value: form.city, onChange: (e) => setForm({ ...form, city: e.target.value }) })}</Field>
            <Field label="Village">{input({ value: form.village, onChange: (e) => setForm({ ...form, village: e.target.value }) })}</Field>
            <Field label="CNIC">{input({ value: form.cnic, onChange: (e) => setForm({ ...form, cnic: e.target.value }) })}</Field>
          </div>
        )}

        {category === "company" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2"><Field label="Company name *">{input({ value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), required: true })}</Field></div>
            <Field label="Type">
              <select className="input-field w-full" value={form.companyType} onChange={(e) => setForm({ ...form, companyType: e.target.value })}>
                <option value="supplier">Supplier</option>
                <option value="buyer">Buyer</option>
                <option value="both">Both</option>
              </select>
            </Field>
            <Field label="Contact person">{input({ value: form.contactPerson, onChange: (e) => setForm({ ...form, contactPerson: e.target.value }) })}</Field>
            <Field label="Phone">{input({ value: form.phone, onChange: (e) => setForm({ ...form, phone: e.target.value }) })}</Field>
            <Field label="City">{input({ value: form.city, onChange: (e) => setForm({ ...form, city: e.target.value }) })}</Field>
          </div>
        )}

        {category === "shop" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2"><Field label="Shop name *">{input({ value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), required: true })}</Field></div>
            <Field label="Owner">{input({ value: form.ownerName, onChange: (e) => setForm({ ...form, ownerName: e.target.value }) })}</Field>
            <Field label="Phone">{input({ value: form.phone, onChange: (e) => setForm({ ...form, phone: e.target.value }) })}</Field>
            <Field label="City">{input({ value: form.city, onChange: (e) => setForm({ ...form, city: e.target.value }) })}</Field>
            <Field label="Shop type">
              <select className="input-field w-full" value={form.shopType} onChange={(e) => setForm({ ...form, shopType: e.target.value })}>
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="distributor">Distributor</option>
              </select>
            </Field>
          </div>
        )}

        {category === "salary" && (
          <>
            <div className="rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2.5 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-violet-800">Accounts created automatically</p>
              <ul className="text-xs text-violet-900/80 space-y-0.5 list-disc list-inside">
                <li>Salary payable ledger account (for payroll)</li>
                <li>Personal cash till account (petty cash for this employee)</li>
              </ul>
            </div>

            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Employee details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Field label="Employee name *">{input({ value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), required: true, placeholder: "Full name" })}</Field>
              </div>
              <Field label="Role">
                <select className="input-field w-full text-sm" value={form.role} onChange={(e) => {
                  const role = e.target.value;
                  const loginRole = loginRoleFromEmployeeRole(role);
                  setForm({ ...form, role, loginRole, allowedModules: defaultModulesForRole(loginRole) });
                }}>
                  {EMP_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Department">{input({ value: form.department, onChange: (e) => setForm({ ...form, department: e.target.value }), placeholder: "e.g. Sales, Accounts" })}</Field>
              <Field label="CNIC">{input({ value: form.cnic, onChange: (e) => setForm({ ...form, cnic: e.target.value }), placeholder: "35202-1234567-1" })}</Field>
              <Field label="Phone">{input({ value: form.phone, onChange: (e) => setForm({ ...form, phone: e.target.value }), placeholder: "03xx-xxxxxxx" })}</Field>
              <Field label="Monthly salary (₨)">{input({ type: "number", step: "any", value: form.salary, onChange: (e) => setForm({ ...form, salary: e.target.value }), placeholder: "0" })}</Field>
            </div>

            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 pt-1">System access</p>
            <EmployeeLoginFields form={form} setForm={setForm} isEdit={false} />
            {!form.createLogin && (
              <Field label="Or link existing login user">
                <select className="input-field w-full text-sm" value={form.assignUserId} onChange={(e) => setForm({ ...form, assignUserId: e.target.value })}>
                  <option value="">None — employee record only</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                </select>
              </Field>
            )}
          </>
        )}

        {category === "transport" && transportMode === "driver" && (
          <>
            <div className="rounded-lg border border-cyan-100 bg-cyan-50/60 px-3 py-2.5 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-800">Accounts created automatically</p>
              <ul className="text-xs text-cyan-900/80 space-y-0.5 list-disc list-inside">
                <li>Transport ledger account</li>
                <li>Personal cash till account</li>
              </ul>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Field label="Driver name *">{input({ value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), required: true })}</Field>
              </div>
              <Field label="Phone">{input({ value: form.phone, onChange: (e) => setForm({ ...form, phone: e.target.value }) })}</Field>
              <Field label="CNIC">{input({ value: form.cnic, onChange: (e) => setForm({ ...form, cnic: e.target.value }) })}</Field>
              <Field label="Monthly salary (₨)">{input({ type: "number", value: form.salary, onChange: (e) => setForm({ ...form, salary: e.target.value }) })}</Field>
            </div>
          </>
        )}

        {category === "transport" && transportMode === "vehicle" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Registration number *">{input({ value: form.registrationNumber, onChange: (e) => setForm({ ...form, registrationNumber: e.target.value }), required: true })}</Field>
            <Field label="Vehicle type">
              <select className="input-field w-full" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
                {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Capacity (tons)">{input({ type: "number", value: form.capacity, onChange: (e) => setForm({ ...form, capacity: e.target.value }) })}</Field>
            <Field label="Driver name">{input({ value: form.driverName, onChange: (e) => setForm({ ...form, driverName: e.target.value }) })}</Field>
            <Field label="Driver phone">{input({ value: form.driverPhone, onChange: (e) => setForm({ ...form, driverPhone: e.target.value }) })}</Field>
            <label className="flex items-center gap-2 text-sm cursor-pointer md:col-span-2">
              <input type="checkbox" checked={form.linkDriverAccount} onChange={(e) => setForm({ ...form, linkDriverAccount: e.target.checked })} />
              Create transport ledger account for driver
            </label>
          </div>
        )}

      </form>
    </Modal>
  );
}

function getEmptyForm(category, transportMode) {
  const base = { isActive: true };
  switch (category) {
    case "cash":
      return { ...base, name: "", openingBalance: "", assignToAdmin: false, assignToUserId: "" };
    case "bank":
      return { ...base, bankName: "", accountTitle: "", accountNumber: "", branchCode: "", branchName: "", ledgerName: "", openingBalance: "" };
    case "farmer":
      return { ...base, name: "", phone: "", city: "", village: "", cnic: "" };
    case "company":
      return { ...base, name: "", contactPerson: "", phone: "", city: "", companyType: "both" };
    case "shop":
      return { ...base, name: "", ownerName: "", phone: "", city: "", shopType: "retail" };
    case "salary": {
      const role = "officer";
      const loginRole = loginRoleFromEmployeeRole(role);
      return {
        ...base,
        name: "",
        phone: "",
        role,
        department: "",
        salary: "",
        cnic: "",
        assignUserId: "",
        createLogin: false,
        ...emptyLoginFormFields(loginRole),
      };
    }
    case "transport":
      if (transportMode === "vehicle") {
        return { ...base, registrationNumber: "", vehicleType: "truck", capacity: "", driverName: "", driverPhone: "", linkDriverAccount: true, isOwned: true };
      }
      return { ...base, name: "", phone: "", cnic: "", salary: "" };
    default:
      return base;
  }
}

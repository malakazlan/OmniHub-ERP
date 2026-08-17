"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { DIRECTORY_POST_FLAG } from "@/components/accounts/DirectoryShell";
import { useDirectoryAdmin } from "@/components/accounts/DirectoryAdminActions";
import EmployeeLoginFields, { emptyLoginFormFields } from "@/components/hr/EmployeeLoginFields";
import { defaultModulesForRole, loginRoleFromEmployeeRole } from "@/lib/modulePresets";
import {
  CATEGORY_TITLES,
  AccountCategoryFields,
  validateAccountForm,
} from "@/components/accounts/accountFormShared";

export default function AccountRegisterModal({ isOpen, onClose, category, onSuccess }) {
  const { showToast } = useToast();
  const isAdmin = useDirectoryAdmin();
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(() => getEmptyForm(category));

  useEffect(() => {
    if (!isOpen || !isAdmin) return;
    fetch("/api/settings/users")
      .then((r) => r.json())
      .then((d) => setUsers((d.users || []).filter((u) => u.isActive)));
  }, [isOpen, isAdmin]);

  useEffect(() => {
    setForm(getEmptyForm(category));
  }, [category, isOpen]);

  if (!isAdmin) return null;

  const title = `New ${CATEGORY_TITLES[category] || "Account"}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateAccountForm(category, form);
    if (err) {
      showToast(err, "warning");
      return;
    }

    setSubmitting(true);
    try {
      let res;
      switch (category) {
        case "cash":
          res = await fetch("/api/accounts/directory/cash", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: form.name.trim(),
              phone: form.phone.trim(),
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
        case "company":
        case "shop":
          res = await fetch(
            category === "farmer" ? "/api/farmers" : category === "company" ? "/api/companies" : "/api/shops",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...form, ...DIRECTORY_POST_FLAG }),
            }
          );
          break;
        case "salary":
          res = await fetch("/api/hr/employees", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: form.name.trim(),
              phone: form.phone.trim(),
              role: form.role,
              department: form.department,
              salary: form.salary,
              cnic: form.cnic,
              openingBalance: form.openingBalance,
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
          res = await fetch("/api/hr/employees", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: form.name.trim(),
              phone: form.phone.trim(),
              cnic: form.cnic,
              salary: form.salary,
              openingBalance: form.openingBalance,
              role: "driver",
              department: "Transport",
              isActive: form.isActive,
              createAccount: true,
              createCashAccount: true,
              ...DIRECTORY_POST_FLAG,
            }),
          });
          break;
        case "vehicle":
          res = await fetch("/api/accounts/directory/vehicle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, ...DIRECTORY_POST_FLAG }),
          });
          break;
        default:
          showToast("Unknown account type", "error");
          return;
      }

      const data = await res.json();
      if (res.ok) {
        showToast(`${CATEGORY_TITLES[category] || "Account"} registered successfully`, "success");
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

  const formId = `register-${category}-form`;

  const submitFooter = (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white cursor-pointer">
        Cancel
      </button>
      <Button type="submit" form={formId} disabled={submitting} className="bg-acc-accounts hover:bg-teal-700 border-0 min-w-[130px] px-5 py-2 text-sm">
        {submitting ? "Saving…" : "Save Account"}
      </Button>
    </div>
  );

  const loginFields = category === "salary" ? (
    <EmployeeLoginFields form={form} setForm={setForm} isEdit={false} />
  ) : null;

  return (
      <Modal isOpen={isOpen} onClose={onClose} title={title} size={category === "salary" || category === "company" || category === "vehicle" ? "lg" : "md"} footer={submitFooter}>
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-600 bg-teal-50/80 border border-teal-100 rounded-lg px-3 py-2">
          {category === "vehicle" ? (
            <>Only <strong>registration number</strong>, <strong>vehicle type</strong>, and <strong>driver phone</strong> are required. A ledger account is created automatically.</>
          ) : (
            <>Only <strong>name</strong> and <strong>phone</strong> are required. A ledger account is created automatically.</>
          )}
        </p>

        <AccountCategoryFields
          category={category}
          form={form}
          setForm={setForm}
          mode="create"
          users={users}
          loginFields={loginFields}
        />
      </form>
    </Modal>
  );
}

function getEmptyForm(category) {
  const base = { isActive: true, phone: "", openingBalance: "" };
  switch (category) {
    case "cash":
      return { ...base, name: "", assignToAdmin: false, assignToUserId: "" };
    case "bank":
      return { ...base, bankName: "", accountTitle: "", accountNumber: "", branchCode: "", branchName: "", ledgerName: "" };
    case "farmer":
      return { ...base, name: "", city: "", village: "", cnic: "", fatherName: "", whatsappNumber: "", address: "" };
    case "company":
      return { ...base, name: "", contactPerson: "", city: "", email: "", ntn: "", strn: "", companyType: "both", whatsappNumber: "", address: "" };
    case "shop":
      return { ...base, name: "", ownerName: "", city: "", shopType: "retail", whatsappNumber: "", address: "" };
    case "salary": {
      const role = "officer";
      const loginRole = loginRoleFromEmployeeRole(role);
      return {
        ...base,
        name: "",
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
      return { ...base, name: "", cnic: "", salary: "" };
    case "vehicle":
      return {
        ...base,
        registrationNumber: "",
        vehicleType: "truck",
        make: "",
        model: "",
        year: "",
        capacity: "",
        driverName: "",
        driverPhone: "",
        isOwned: true,
        notes: "",
      };
    default:
      return base;
  }
}

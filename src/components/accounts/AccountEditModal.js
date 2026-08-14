"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { Loader2 } from "lucide-react";
import { useDirectoryAdmin } from "@/components/accounts/DirectoryAdminActions";
import {
  CATEGORY_TITLES,
  AccountCategoryFields,
  validateAccountForm,
  formFromPartyEntity,
} from "@/components/accounts/accountFormShared";

export default function AccountEditModal({ isOpen, onClose, account, onSuccess }) {
  const { showToast } = useToast();
  const isAdmin = useDirectoryAdmin();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({ isActive: true });

  const category = account?.category;

  useEffect(() => {
    if (!isOpen || !account?.id || !isAdmin) return;

    setLoading(true);

    const accountPromise = fetch(`/api/accounts/${account.id}`).then((r) => r.json());
    const usersPromise =
      category === "cash"
        ? fetch("/api/settings/users").then((r) => r.json())
        : Promise.resolve(null);

    Promise.all([accountPromise, usersPromise])
      .then(([data, usersData]) => {
        if (data.account) {
          setDetail(data);
          let nextForm = formFromPartyEntity(
            data.account.category,
            data.account,
            data.partyEntity,
            data.bankMeta
          );
          if (category === "cash" && usersData) {
            const activeUsers = (usersData.users || []).filter((u) => u.isActive);
            setUsers(activeUsers);
            if (data.account.ownerUserId) {
              const owner = activeUsers.find((u) => u.id === data.account.ownerUserId);
              nextForm = {
                ...nextForm,
                assignToAdmin: owner?.role === "admin",
                assignToUserId: owner?.role === "admin" ? "" : String(data.account.ownerUserId),
              };
            }
          }
          setForm(nextForm);
        } else {
          showToast(data.error || "Failed to load account", "error");
        }
      })
      .catch(() => showToast("Error loading account", "error"))
      .finally(() => setLoading(false));
  }, [isOpen, account?.id, isAdmin, category, showToast]);

  if (!isAdmin || !account) return null;

  const title = `Edit ${CATEGORY_TITLES[category] || "Account"}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateAccountForm(category, form);
    if (err) {
      showToast(err, "warning");
      return;
    }

    const entityId = detail?.entityId;
    setSubmitting(true);
    try {
      let res;

      switch (category) {
        case "farmer":
          if (!entityId) throw new Error("Farmer record not found");
          res = await fetch(`/api/farmers/${entityId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: form.name.trim(),
              phone: form.phone.trim(),
              fatherName: form.fatherName || null,
              cnic: form.cnic?.trim() || null,
              city: form.city || null,
              village: form.village || null,
              whatsappNumber: form.whatsappNumber || null,
              address: form.address || null,
              isActive: form.isActive,
            }),
          });
          break;
        case "company":
          if (!entityId) throw new Error("Company record not found");
          res = await fetch(`/api/companies/${entityId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: form.name.trim(),
              contactPerson: form.contactPerson || null,
              phone: form.phone.trim(),
              city: form.city || null,
              email: form.email || null,
              ntn: form.ntn || null,
              strn: form.strn || null,
              companyType: form.companyType,
              whatsappNumber: form.whatsappNumber || null,
              address: form.address || null,
              isActive: form.isActive,
            }),
          });
          break;
        case "shop":
          if (!entityId) throw new Error("Shop record not found");
          res = await fetch(`/api/shops/${entityId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: form.name.trim(),
              ownerName: form.ownerName || null,
              phone: form.phone.trim(),
              city: form.city || null,
              shopType: form.shopType,
              whatsappNumber: form.whatsappNumber || null,
              address: form.address || null,
              isActive: form.isActive,
            }),
          });
          break;
        case "salary":
        case "transport":
          if (!entityId) throw new Error("Employee record not found");
          res = await fetch(`/api/hr/employees/${entityId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: form.name.trim(),
              phone: form.phone.trim(),
              role: form.role,
              department: form.department || null,
              salary: form.salary,
              cnic: form.cnic?.trim() || null,
              isActive: form.isActive,
            }),
          });
          break;
        case "bank":
          res = await fetch(`/api/accounts/${account.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: form.accountTitle?.trim() || form.bankName?.trim(),
              phone: form.phone?.trim() || null,
              isActive: form.isActive,
              bankMeta: {
                bankName: form.bankName || null,
                accountTitle: form.accountTitle || null,
                accountNumber: form.accountNumber || null,
                branchCode: form.branchCode || null,
                branchName: form.branchName || null,
              },
            }),
          });
          break;
        case "cash": {
          let ownerUserId = null;
          if (form.assignToAdmin) {
            ownerUserId = users.find((u) => u.role === "admin")?.id ?? null;
          } else if (form.assignToUserId) {
            ownerUserId = parseInt(form.assignToUserId, 10);
          }
          res = await fetch(`/api/accounts/${account.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: form.name?.trim(),
              phone: form.phone?.trim() || null,
              isActive: form.isActive,
              ownerUserId,
            }),
          });
          break;
        }
        default:
          res = await fetch(`/api/accounts/${account.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: form.name?.trim(),
              phone: form.phone?.trim() || null,
              city: form.city || null,
              whatsappNumber: form.whatsappNumber || null,
              address: form.address || null,
              isActive: form.isActive,
            }),
          });
      }

      const data = await res.json();
      if (res.ok) {
        showToast("Account updated", "success");
        onSuccess?.();
        onClose();
      } else {
        showToast(data.error || "Failed to update account", "error");
      }
    } catch (err) {
      showToast(err.message || "Error saving account", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white cursor-pointer">
        Cancel
      </button>
      <Button type="submit" form="account-edit-form" disabled={submitting || loading} className="bg-acc-accounts border-0 min-w-[100px]">
        {submitting ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={category === "company" || category === "salary" ? "lg" : "md"} footer={footer}>
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-7 h-7 text-acc-accounts animate-spin" />
        </div>
      ) : (
        <form id="account-edit-form" onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
            Code: <span className="font-mono font-semibold text-slate-700">{account.code || "—"}</span>
            <span className="ml-2 text-slate-400">· {category}</span>
            <span className="block mt-1 text-slate-500">Only <strong>name</strong> and <strong>phone</strong> are required.</span>
          </p>

          <AccountCategoryFields
            category={category}
            form={form}
            setForm={setForm}
            mode="edit"
            users={users}
            accountMeta={detail?.account || account}
          />

          <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-slate-700 px-1">
            <input
              type="checkbox"
              checked={form.isActive !== false}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Account active
          </label>
        </form>
      )}
    </Modal>
  );
}

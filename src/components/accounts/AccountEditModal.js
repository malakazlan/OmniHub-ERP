"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/Button";
import { useDirectoryAdmin } from "@/components/accounts/DirectoryAdminActions";

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>}
      {children}
    </div>
  );
}

export default function AccountEditModal({ isOpen, onClose, account, onSuccess }) {
  const { showToast } = useToast();
  const isAdmin = useDirectoryAdmin();
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    whatsappNumber: "",
    address: "",
    isActive: true,
    ownerUserId: "",
  });

  useEffect(() => {
    if (!isOpen || !account) return;
    setForm({
      name: account.name || "",
      phone: account.phone || "",
      city: account.city || "",
      whatsappNumber: account.whatsappNumber || "",
      address: account.address || "",
      isActive: account.isActive !== false,
      ownerUserId: account.ownerUserId ? String(account.ownerUserId) : "",
    });
  }, [isOpen, account]);

  useEffect(() => {
    if (!isOpen || !isAdmin || account?.category !== "cash") return;
    fetch("/api/settings/users")
      .then((r) => r.json())
      .then((d) => setUsers((d.users || []).filter((u) => u.isActive)));
  }, [isOpen, isAdmin, account?.category]);

  if (!isAdmin || !account) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast("Account name is required", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone || null,
          city: form.city || null,
          whatsappNumber: form.whatsappNumber || null,
          address: form.address || null,
          isActive: form.isActive,
          ownerUserId:
            account.category === "cash"
              ? form.ownerUserId
                ? parseInt(form.ownerUserId, 10)
                : null
              : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Account updated", "success");
        onSuccess?.();
        onClose();
      } else {
        showToast(data.error || "Failed to update account", "error");
      }
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white cursor-pointer"
      >
        Cancel
      </button>
      <Button type="submit" form="account-edit-form" disabled={submitting} className="bg-acc-accounts border-0 min-w-[100px]">
        {submitting ? "Saving…" : "Save"}
      </Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Account" size="md" footer={footer}>
      <form id="account-edit-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
          Code: <span className="font-mono font-semibold text-slate-700">{account.code || "—"}</span>
          {account.category && (
            <span className="ml-2 text-slate-400">· {account.category}</span>
          )}
        </p>
        <Field label="Account name *">
          <input
            className="input-field w-full text-sm"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Phone">
            <input className="input-field w-full text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="City">
            <input className="input-field w-full text-sm" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="WhatsApp">
            <input className="input-field w-full text-sm" value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} />
          </Field>
          {account.category === "cash" && (
            <Field label="Assigned user">
              <select
                className="input-field w-full text-sm"
                value={form.ownerUserId}
                onChange={(e) => setForm({ ...form, ownerUserId: e.target.value })}
              >
                <option value="">Office pool (unassigned)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <Field label="Address">
          <textarea
            className="input-field w-full text-sm min-h-[72px] resize-y"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-slate-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          Account active
        </label>
      </form>
    </Modal>
  );
}

"use client";

import { Pencil, Trash2 } from "lucide-react";
import useAuth from "@/hooks/useAuth";

export function useDirectoryAdmin() {
  const { user } = useAuth();
  return user?.role === "admin";
}

/** Stop row navigation when clicking actions */
export function DirectoryAdminActions({ onEdit, onDelete }) {
  const isAdmin = useDirectoryAdmin();
  if (!isAdmin) return null;

  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        title="Edit"
        onClick={onEdit}
        className="p-1.5 rounded-lg hover:bg-sky-50 text-slate-400 hover:text-acc-accounts transition-colors cursor-pointer"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        title="Delete"
        onClick={onDelete}
        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function DirectoryAdminNotice() {
  const isAdmin = useDirectoryAdmin();
  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        Only <strong>admin</strong> can register, edit, or delete project accounts. Contact your administrator for changes.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-xs text-slate-600">
      <strong className="text-slate-800">Admin control:</strong> Edit or delete any account from this list.
      Records with transactions may need to be <strong>suspended</strong> instead of deleted.
    </div>
  );
}

export async function confirmDirectoryDelete(label) {
  return window.confirm(
    `Delete ${label}?\n\nThis removes the party and linked ledger account when allowed. Cannot be undone.`
  );
}

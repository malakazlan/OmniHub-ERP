"use client";

import { Pencil, Trash2, ChevronRight } from "lucide-react";
import useAuth from "@/hooks/useAuth";

export function useDirectoryAdmin() {
  const { user } = useAuth();
  return user?.role === "admin";
}

/** Row actions — right-aligned edit / delete / open */
export function DirectoryAdminActions({ onEdit, onDelete, onView }) {
  const isAdmin = useDirectoryAdmin();

  return (
    <div
      className="flex items-center justify-end gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      {isAdmin && (
        <>
          <button
            type="button"
            title="Edit account"
            onClick={onEdit}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--brand-primary)] bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <Pencil className="w-3 h-3 shrink-0" />
            Edit
          </button>
          <button
            type="button"
            title="Delete account"
            onClick={onDelete}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--status-danger)] bg-red-50 border border-red-100 hover:bg-red-100 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3 shrink-0" />
            Delete
          </button>
        </>
      )}
      {onView && (
        <button
          type="button"
          title="View ledger"
          onClick={onView}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
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

"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function DirectoryBackLink({ segment }) {
  return (
    <Link
      href="/accounts"
      className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-acc-accounts transition-colors mb-2"
    >
      <ArrowLeft className="w-3.5 h-3.5" /> All Accounts{segment ? ` · ${segment}` : ""}
    </Link>
  );
}

export const DIRECTORY_POST_FLAG = { fromDirectory: true };

/** Shown on module list pages — registration happens on All Accounts only. */
export function DirectoryRegisterBanner({ category, label }) {
  const href = category ? `/accounts?category=${category}&create=1` : "/accounts";
  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>
        New {label} accounts are registered in{" "}
        <Link href="/accounts" className="text-acc-accounts font-semibold hover:underline">
          All Accounts
        </Link>
        . This page is for viewing balances and transactions.
      </span>
      <Link href={href} className="text-acc-accounts font-semibold hover:underline whitespace-nowrap">
        Register {label} →
      </Link>
    </div>
  );
}

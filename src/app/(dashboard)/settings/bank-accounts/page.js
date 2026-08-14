"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Bank accounts are managed under Accounts → Bank directory (single source of truth). */
export default function BankAccountsSettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/accounts/directory/bank");
  }, [router]);
  return null;
}

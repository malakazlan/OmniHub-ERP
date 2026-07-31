"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Redirect old Project Accounts routes to unified All Accounts page */
export default function AccountsDirectoryRedirect({ category, create = false, mode }) {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (create) params.set("create", "1");
    if (mode) params.set("mode", mode);
    const qs = params.toString();
    router.replace(qs ? `/accounts?${qs}` : "/accounts");
  }, [router, category, create, mode]);

  return (
    <div className="min-h-[300px] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
    </div>
  );
}

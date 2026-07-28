"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { mustScopeOrdersToSelf } from "@/lib/ordersNav";
import { Loader2 } from "lucide-react";
import NewOrderForm from "@/components/orders/NewOrderForm";

export default function MyNewOrderPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && !mustScopeOrdersToSelf(user)) {
      router.replace("/orders/new");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-9 h-9 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <NewOrderForm
      variant="mobile"
      backHref="/orders/my"
      successPath={(id) => `/orders/my/${id}`}
    />
  );
}

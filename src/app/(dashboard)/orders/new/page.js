"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { mustScopeOrdersToSelf } from "@/lib/ordersNav";
import { Loader2 } from "lucide-react";
import NewOrderForm from "@/components/orders/NewOrderForm";

export default function NewOrderPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && mustScopeOrdersToSelf(user)) {
      router.replace("/orders/my/new");
    }
  }, [loading, user, router]);

  if (loading || (user && mustScopeOrdersToSelf(user))) {
    return (
      <div className="h-72 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  return <NewOrderForm backHref="/orders" successPath={(id) => `/orders/${id}`} variant="admin" />;
}

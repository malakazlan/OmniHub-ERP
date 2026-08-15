"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { mustScopeOrdersToSelf } from "@/lib/ordersNav";
import { useToast } from "@/context/ToastContext";
import OrderListView from "@/components/orders/OrderListView";
import { Loader2 } from "lucide-react";

export default function OrdersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "admin" || user?.role === "manager";

  useEffect(() => {
    if (!authLoading && user && mustScopeOrdersToSelf(user)) {
      router.replace("/orders/my");
    }
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders?view=all");
      const data = await res.json();
      if (res.ok) setOrders(data.orders || []);
      else showToast(data.error || "Failed to load orders", "error");
    } catch {
      showToast("Error loading orders", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (authLoading || !user || mustScopeOrdersToSelf(user)) return;
    load();
  }, [load, authLoading, user]);

  if (authLoading || (user && mustScopeOrdersToSelf(user))) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-acc-orders animate-spin" />
      </div>
    );
  }

  return <OrderListView orders={orders} loading={loading} isAdmin={isAdmin} />;
}

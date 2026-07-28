"use client";

import React from "react";
import useAuth from "@/hooks/useAuth";
import { usesEmployeeDashboard } from "@/lib/employeeDashboard";
import ExecutiveDashboard from "@/components/dashboard/ExecutiveDashboard";
import EmployeeDashboard from "@/components/dashboard/EmployeeDashboard";
import { Loader2 } from "lucide-react";

export default function DashboardHome() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-72 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-acc-dashboard animate-spin" />
      </div>
    );
  }

  if (user && usesEmployeeDashboard(user)) {
    return (
      <div className="emp-portal-page">
        <EmployeeDashboard />
      </div>
    );
  }

  return <ExecutiveDashboard />;
}

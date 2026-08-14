"use client";

import React, { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { Loader2 } from "lucide-react";
import FleetListView from "@/components/fleet/FleetListView";
import FleetDetailView from "@/components/fleet/FleetDetailView";
import FleetReportView from "@/components/fleet/FleetReportView";
import RegisterVehicleModal from "@/components/fleet/RegisterVehicleModal";
import RecordExpenseModal from "@/components/fleet/RecordExpenseModal";

function FleetHubContent() {
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [vehicles, setVehicles] = useState([]);
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expensesLoading, setExpensesLoading] = useState(false);

  const [view, setView] = useState("list");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [reportFocusVehicle, setReportFocusVehicle] = useState(null);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [expenseOpen, setExpenseOpen] = useState(false);

  const syncUrl = useCallback((nextView, vehicleId) => {
    const params = new URLSearchParams();
    if (nextView === "detail" && vehicleId) {
      params.set("id", String(vehicleId));
    } else if (nextView === "report") {
      params.set("report", "1");
      if (vehicleId) params.set("id", String(vehicleId));
    } else if (nextView === "register") {
      params.set("register", "1");
    }
    const qs = params.toString();
    router.replace(qs ? `/transport/vehicles?${qs}` : "/transport/vehicles", { scroll: false });
  }, [router]);

  const fetchFleet = useCallback(async () => {
    try {
      const [vRes, eRes, aRes] = await Promise.all([
        fetch("/api/transport/vehicles"),
        fetch("/api/transport/vehicle-expenses"),
        fetch("/api/accounts"),
      ]);
      const vData = await vRes.json();
      const eData = await eRes.json();
      const aData = await aRes.json();

      if (vRes.ok) {
        setVehicles(vData.vehicles || []);
        setSummary(vData.summary || null);
      } else showToast(vData.error || "Failed to load fleet", "error");

      if (eRes.ok) setExpenses(eData.expenses || []);

      if (aRes.ok) {
        const accounts = aData.accounts || [];
        setCashAccounts(accounts.filter((a) => a.category === "cash" && a.isActive));
        setBankAccounts(accounts.filter((a) => a.category === "bank" && a.isActive));
      }
    } catch {
      showToast("Error connecting to server", "error");
    } finally {
      setLoading(false);
      setExpensesLoading(false);
    }
  }, [showToast]);

  const fetchVehicleExpenses = useCallback(async (vehicleId) => {
    setExpensesLoading(true);
    try {
      const res = await fetch(`/api/transport/vehicle-expenses?vehicleId=${vehicleId}`);
      const data = await res.json();
      if (res.ok) {
        setExpenses((prev) => {
          const other = prev.filter((e) => e.vehicleId !== vehicleId);
          return [...other, ...(data.expenses || [])];
        });
      }
    } finally {
      setExpensesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFleet();
  }, [fetchFleet]);

  useEffect(() => {
    if (loading || !vehicles.length) {
      if (searchParams.get("register") === "1") setRegisterOpen(true);
      return;
    }

    const id = searchParams.get("id");
    const report = searchParams.get("report") === "1";
    const register = searchParams.get("register") === "1";

    if (register) {
      setView("list");
      setRegisterOpen(true);
      return;
    }

    if (id) {
      const v = vehicles.find((x) => String(x.id) === id);
      if (v) {
        setSelectedVehicle(v);
        if (report) {
          setView("report");
          setReportFocusVehicle(v);
        } else {
          setView("detail");
          fetchVehicleExpenses(v.id);
        }
        return;
      }
    }

    if (report) {
      setView("report");
      setReportFocusVehicle(null);
      return;
    }

    setView("list");
    setSelectedVehicle(null);
    setReportFocusVehicle(null);
  }, [loading, vehicles, searchParams, fetchVehicleExpenses]);

  const openVehicle = (v) => {
    setSelectedVehicle(v);
    setView("detail");
    syncUrl("detail", v.id);
    fetchVehicleExpenses(v.id);
  };

  const openReport = (v = null) => {
    setReportFocusVehicle(v);
    setView("report");
    syncUrl("report", v?.id);
  };

  const backToList = () => {
    setView("list");
    setSelectedVehicle(null);
    setReportFocusVehicle(null);
    syncUrl("list");
  };

  const handleRegisterSuccess = async () => {
    showToast("Vehicle saved", "success");
    await fetchFleet();
  };

  const handleExpenseSuccess = async () => {
    showToast("Expense recorded", "success");
    setExpensesLoading(true);
    await fetchFleet();
    if (selectedVehicle) await fetchVehicleExpenses(selectedVehicle.id);
  };

  const handleDeleteExpense = async (expense) => {
    if (!window.confirm(`Delete this ${expense.expenseType} expense?`)) return;
    try {
      const res = await fetch(`/api/transport/vehicle-expenses/${expense.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Expense deleted", "success");
        await fetchFleet();
        if (selectedVehicle) await fetchVehicleExpenses(selectedVehicle.id);
      } else showToast(data.error || "Failed to delete", "error");
    } catch {
      showToast("Error processing request", "error");
    }
  };

  const vehicleExpenses = selectedVehicle
    ? expenses.filter((e) => e.vehicleId === selectedVehicle.id).sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate))
    : [];

  return (
    <div className="pb-8">
      {view === "list" && (
        <FleetListView
          vehicles={vehicles}
          summary={summary}
          loading={loading}
          viewMode={view}
          onViewModeChange={() => setView("list")}
          onRegister={() => { setEditVehicle(null); setRegisterOpen(true); syncUrl("register"); }}
          onOpenReport={() => openReport()}
          onOpenVehicle={openVehicle}
          onEditVehicle={(v) => { setEditVehicle(v); setRegisterOpen(true); }}
          onOpenVehicleReport={(v) => openReport(v)}
        />
      )}

      {view === "detail" && selectedVehicle && (
        <FleetDetailView
          vehicle={selectedVehicle}
          expenses={vehicleExpenses}
          loading={expensesLoading}
          onBack={backToList}
          onEdit={() => { setEditVehicle(selectedVehicle); setRegisterOpen(true); }}
          onAddExpense={() => setExpenseOpen(true)}
          onViewReport={() => openReport(selectedVehicle)}
          onDeleteExpense={handleDeleteExpense}
        />
      )}

      {view === "report" && (
        <FleetReportView
          vehicles={vehicles}
          expenses={expenses}
          loading={loading}
          focusVehicle={reportFocusVehicle}
          onBack={backToList}
          onOpenVehicle={openVehicle}
        />
      )}

      <RegisterVehicleModal
        isOpen={registerOpen}
        onClose={() => {
          setRegisterOpen(false);
          setEditVehicle(null);
          if (view === "detail" && selectedVehicle) syncUrl("detail", selectedVehicle.id);
          else if (view === "report") syncUrl("report", reportFocusVehicle?.id);
          else syncUrl("list");
        }}
        vehicle={editVehicle}
        onSuccess={handleRegisterSuccess}
      />

      <RecordExpenseModal
        isOpen={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        vehicle={selectedVehicle}
        cashAccounts={cashAccounts}
        bankAccounts={bankAccounts}
        onSuccess={handleExpenseSuccess}
      />
    </div>
  );
}

export default function FleetHubPage() {
  return (
    <Suspense fallback={<div className="min-h-[400px] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" /></div>}>
      <FleetHubContent />
    </Suspense>
  );
}

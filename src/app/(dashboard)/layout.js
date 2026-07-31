"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { Loader2, Wheat } from "lucide-react";

function AuthLoadingScreen({ message = "Loading Warraich Traders…" }) {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0F52BA] to-[#0B3E8F] flex items-center justify-center mb-4 shadow-lg shadow-blue-900/15">
        <Wheat className="w-6 h-6 text-white" />
      </div>
      <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)] mb-2" />
      <p className="text-sm text-[var(--text-secondary)] font-medium">{message}</p>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (user) {
    return (
      <div className="erp-app-shell h-screen flex font-sans overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="relative flex flex-col flex-1 min-w-0 min-h-0">
          <TopBar onMenuClick={() => setSidebarOpen(true)} />
          <main className="erp-main-surface flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-5 sm:py-5 lg:p-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="print-area max-w-[1600px] mx-auto space-y-6">{children}</div>
          </main>
          {/* Modal overlay host — covers main column only (sidebar stays sharp) */}
          <div id="erp-modal-root" className="absolute inset-0 z-[200] pointer-events-none" aria-hidden />
        </div>
      </div>
    );
  }

  if (!loading && !user) {
    return <AuthLoadingScreen message="Redirecting to sign in…" />;
  }

  return <AuthLoadingScreen />;
}

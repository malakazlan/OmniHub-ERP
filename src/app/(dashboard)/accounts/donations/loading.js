import { Loader2 } from "lucide-react";

export default function DonationsLoading() {
  return (
    <div className="erp-donation-surface page-enter pb-8 min-h-[420px] flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 text-rose-600 animate-spin mx-auto" />
        <p className="text-sm font-medium text-slate-600">Loading donations...</p>
      </div>
    </div>
  );
}

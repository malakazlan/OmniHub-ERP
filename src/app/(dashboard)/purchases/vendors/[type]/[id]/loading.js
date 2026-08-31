import { Loader2 } from "lucide-react";

export default function PurchaseVendorDetailLoading() {
  return (
    <div className="erp-pv-surface page-enter pb-8 min-h-[420px] flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <p className="text-sm font-medium text-slate-600">Loading vendor profile...</p>
      </div>
    </div>
  );
}

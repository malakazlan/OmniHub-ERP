import { Loader2 } from "lucide-react";

export default function PurchaseVendorsLoading() {
  return (
    <div className="erp-pv-surface page-enter pb-8 min-h-[420px] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );
}

"use client";

import { Construction } from "lucide-react";

const STYLES = {
  purchases: { icon: "text-acc-purchases", ring: "border-blue-100 bg-blue-50" },
  sales: { icon: "text-acc-sales", ring: "border-green-100 bg-green-50" },
  transport: { icon: "text-acc-transport", ring: "border-cyan-100 bg-cyan-50" },
  hr: { icon: "text-acc-hr", ring: "border-pink-100 bg-pink-50" },
  reports: { icon: "text-acc-reports", ring: "border-teal-100 bg-teal-50" },
  settings: { icon: "text-acc-settings", ring: "border-slate-200 bg-slate-50" },
};

export default function ModulePlaceholder({ title, description, icon: Icon, module = "settings" }) {
  const style = STYLES[module] || STYLES.settings;

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-5 page-enter">
      <div className={`p-5 rounded-2xl border ${style.ring}`}>
        {Icon ? <Icon className={`w-12 h-12 ${style.icon}`} /> : <Construction className={`w-12 h-12 ${style.icon}`} />}
      </div>
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 max-w-md mt-2 leading-relaxed">{description}</p>
      </div>
      <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
        Building next…
      </span>
    </div>
  );
}

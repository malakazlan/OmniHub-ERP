"use client";

import { Construction } from "lucide-react";

export default function ModulePlaceholder({ title, description, icon: Icon, module }) {
  void module;
  const Glyph = Icon || Construction;

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-5 page-enter">
      <div className="w-16 h-16 rounded-[14px] bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center">
        <Glyph className="w-8 h-8" strokeWidth={1.6} />
      </div>
      <div>
        <h1 className="oh-ph-title">{title}</h1>
        <p className="oh-ph-sub max-w-md mt-2 leading-relaxed">{description}</p>
      </div>
      <span className="oh-pill warn">Building next</span>
    </div>
  );
}

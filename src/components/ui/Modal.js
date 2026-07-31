"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

const MODAL_ROOT_ID = "erp-modal-root";

function getPortalTarget() {
  if (typeof document === "undefined") return null;
  return document.getElementById(MODAL_ROOT_ID) || document.body;
}

export function Modal({ isOpen, onClose, title, children, footer, size = "md" }) {
  const [mounted, setMounted] = useState(false);
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    setMounted(true);
    setPortalTarget(getPortalTarget());
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    const main = document.querySelector(".erp-main-surface");
    const inDashboard = Boolean(document.getElementById(MODAL_ROOT_ID));

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      if (inDashboard && main) {
        main.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "hidden";
      }
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (main) main.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted || !portalTarget) return null;

  const inMainColumn = portalTarget.id === MODAL_ROOT_ID;
  const overlayPosition = inMainColumn ? "absolute" : "fixed";

  return createPortal(
    <div
      className={`${overlayPosition} inset-0 flex items-center justify-center p-4 sm:p-6 pointer-events-auto`}
      role="presentation"
    >
      <div
        className={`${overlayPosition} inset-0 bg-slate-900/45 backdrop-blur-md backdrop-saturate-150`}
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`erp-modal-panel relative z-10 flex w-full flex-col rounded-xl border border-slate-200/90 bg-white shadow-[0_24px_48px_-12px_rgba(15,23,42,0.25)] ${SIZES[size] || SIZES.md}`}
        style={{ maxHeight: "min(88vh, 720px)" }}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <h3 id="modal-title" className="text-sm font-bold text-slate-900 sm:text-base">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          </button>
        </div>

        <div
          className="overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 text-sm text-slate-700"
          style={{ maxHeight: footer ? "calc(min(88vh, 720px) - 7.5rem)" : "calc(min(88vh, 720px) - 3.5rem)" }}
        >
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-slate-100 bg-slate-50/90 px-4 py-3 sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    portalTarget
  );
}

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

export function Modal({ isOpen, onClose, title, description, children, footer, size = "md" }) {
  // Modals start closed, so resolving the portal target lazily is hydration-safe.
  const [mounted] = useState(() => typeof document !== "undefined");
  const [portalTarget] = useState(() => getPortalTarget());

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
        className={`${overlayPosition} inset-0 bg-[rgba(30,36,51,0.45)] backdrop-blur-[2px]`}
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`erp-modal-panel relative z-10 flex w-full flex-col rounded-[var(--radius)] bg-[var(--surface)] text-[var(--ink)] shadow-[0_24px_48px_-12px_rgba(33,58,127,0.25),0_0_0_1px_var(--line)] ${SIZES[size] || SIZES.md}`}
        style={{ maxHeight: "min(88vh, 720px)" }}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h3 id="modal-title" className="text-[14px] font-bold text-[var(--ink)]">
              {title}
            </h3>
            {description && <p className="text-xs text-[var(--ink-3)] mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="oh-icon-btn !w-7 !h-7 shrink-0"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div
          className="overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 text-[13px] text-[var(--ink)]"
          style={{ maxHeight: footer ? "calc(min(88vh, 720px) - 7.5rem)" : "calc(min(88vh, 720px) - 3.5rem)" }}
        >
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 sm:px-5 rounded-b-[var(--radius)]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    portalTarget
  );
}

export default Modal;

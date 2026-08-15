import { captureInvoiceImage, waitForInvoiceElement } from "@/lib/downloadReceiptPdf";

/** Normalize to digits for wa.me / WhatsApp desktop (Pakistan-friendly). */
export function normalizeWhatsAppPhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("0")) {
    digits = `92${digits.slice(1)}`;
  } else if (digits.length === 10 && digits.startsWith("3")) {
    digits = `92${digits}`;
  }

  if (digits.length < 10) return null;
  return digits;
}

export function getWhatsAppWebUrl(phone) {
  const n = normalizeWhatsAppPhone(phone);
  if (!n) return null;
  return `https://web.whatsapp.com/send?phone=${n}`;
}

export function getWhatsAppDesktopUrl(phone) {
  const n = normalizeWhatsAppPhone(phone);
  if (!n) return null;
  return `whatsapp://send?phone=${n}`;
}

export function openWhatsAppChat(phone) {
  const desktop = getWhatsAppDesktopUrl(phone);
  const web = getWhatsAppWebUrl(phone);
  if (!web) throw new Error("Invalid WhatsApp number");

  if (desktop) {
    window.location.href = desktop;
    window.setTimeout(() => {
      window.open(web, "_blank", "noopener,noreferrer");
    }, 1200);
  } else {
    window.open(web, "_blank", "noopener,noreferrer");
  }
}

export async function copyInvoiceScreenshotToClipboard(containerEl) {
  if (!containerEl) throw new Error("Invoice not ready");
  const target = await waitForInvoiceElement(containerEl);
  if (!target) throw new Error("Invoice not found");

  const blob = await captureInvoiceImage(containerEl);
  if (!blob) throw new Error("Could not capture invoice");

  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("Clipboard not supported — use Chrome or Edge on desktop");
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": blob,
    }),
  ]);
}

export async function shareInvoiceOnWhatsApp({ containerEl, phone }) {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) {
    throw new Error("No valid WhatsApp number for this account");
  }

  await copyInvoiceScreenshotToClipboard(containerEl);
  openWhatsAppChat(normalized);

  return {
    copied: true,
    phone: normalized,
  };
}

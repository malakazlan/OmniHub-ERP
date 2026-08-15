import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { DOCUMENT_CAPTURE_CSS } from "@/lib/invoiceCaptureStyles";

const LAYOUT_PROPS = [
  "display",
  "box-sizing",
  "width",
  "height",
  "min-width",
  "max-width",
  "margin",
  "padding",
  "border-width",
  "border-style",
  "border-radius",
  "font-size",
  "font-weight",
  "font-family",
  "line-height",
  "text-align",
  "text-transform",
  "letter-spacing",
  "vertical-align",
  "flex-direction",
  "flex-wrap",
  "align-items",
  "justify-content",
  "gap",
  "grid-template-columns",
  "white-space",
  "border-collapse",
  "overflow",
  "table-layout",
];

const COLOR_PROPS = [
  "color",
  "background-color",
  "border-color",
  "border-top-color",
  "border-bottom-color",
  "border-left-color",
  "border-right-color",
  "outline-color",
  "text-decoration-color",
  "column-rule-color",
];

const UNSUPPORTED_COLOR = /lab\(|oklch\(|lch\(|color\(/i;

function rgbBytesToHex(r, g, b) {
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function rgbStringToHex(value) {
  const m = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (!m) return null;
  return rgbBytesToHex(
    Math.round(Number(m[1])),
    Math.round(Number(m[2])),
    Math.round(Number(m[3]))
  );
}

/** Read any CSS color as sRGB via 1×1 canvas pixel (works for lab/oklch in modern browsers). */
function colorToHexViaCanvas(doc, colorValue, fallback = "#000000") {
  if (!colorValue || colorValue === "transparent" || colorValue === "rgba(0, 0, 0, 0)") {
    return colorValue || fallback;
  }
  if (colorValue.startsWith("#")) return colorValue;
  const fromRgb = rgbStringToHex(colorValue);
  if (fromRgb) return fromRgb;

  const canvas = doc.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return fallback;

  try {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = fallback;
    ctx.fillStyle = colorValue;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a === 0) return fallback;
    return rgbBytesToHex(r, g, b);
  } catch {
    return fallback;
  }
}

/** Resolve any CSS color to #rrggbb for html2canvas. */
function resolveColorToHex(doc, colorValue, fallback = "#000000") {
  if (!colorValue || colorValue === "transparent" || colorValue === "rgba(0, 0, 0, 0)") {
    return colorValue || fallback;
  }
  if (colorValue.startsWith("#")) return colorValue;

  const rgbHex = rgbStringToHex(colorValue);
  if (rgbHex) return rgbHex;

  if (UNSUPPORTED_COLOR.test(colorValue)) {
    return colorToHexViaCanvas(doc, colorValue, fallback);
  }

  const canvasHex = colorToHexViaCanvas(doc, colorValue, fallback);
  if (canvasHex && !UNSUPPORTED_COLOR.test(canvasHex)) return canvasHex;

  const probe = doc.createElement("span");
  probe.style.cssText =
    "position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none;border:1px solid;";
  probe.style.color = colorValue;
  probe.style.borderColor = colorValue;
  probe.style.backgroundColor = colorValue;
  doc.body.appendChild(probe);
  const cs = doc.defaultView.getComputedStyle(probe);
  let rgb = cs.color;
  if (UNSUPPORTED_COLOR.test(rgb)) rgb = cs.borderTopColor;
  if (UNSUPPORTED_COLOR.test(rgb)) rgb = cs.backgroundColor;
  probe.remove();

  return colorToHexViaCanvas(doc, rgb, fallback);
}

function applySafeComputedStyles(source, clone, colorDoc) {
  const view = source.ownerDocument.defaultView;
  const computed = view.getComputedStyle(source);

  clone.removeAttribute("class");

  for (const prop of LAYOUT_PROPS) {
    const value = computed.getPropertyValue(prop);
    if (value) clone.style.setProperty(prop, value);
  }

  for (const prop of COLOR_PROPS) {
    const value = computed.getPropertyValue(prop);
    if (!value) continue;
    const fb = prop.includes("background") ? "#ffffff" : "#0f172a";
    const safe = resolveColorToHex(colorDoc, value, fb);
    clone.style.setProperty(prop, safe);
  }

  clone.style.setProperty("background-image", "none");

  const borderWidth = computed.getPropertyValue("border-width");
  const borderStyle = computed.getPropertyValue("border-style");
  if (borderWidth && borderWidth !== "0px") {
    const bc = resolveColorToHex(colorDoc, computed.getPropertyValue("border-top-color"), "#e2e8f0");
    clone.style.setProperty("border", `${borderWidth} ${borderStyle || "solid"} ${bc}`);
  }

  clone.style.setProperty("box-shadow", "none");
}

/** Strip any remaining lab/oklch from inline styles on the clone tree. */
function sanitizeCloneColors(root, colorDoc) {
  if (!(root instanceof Element)) return;
  if (root.style?.cssText && UNSUPPORTED_COLOR.test(root.style.cssText)) {
    for (const prop of COLOR_PROPS) {
      const val = root.style.getPropertyValue(prop);
      if (val && UNSUPPORTED_COLOR.test(val)) {
        const fb = prop.includes("background") ? "#ffffff" : "#0f172a";
        root.style.setProperty(prop, resolveColorToHex(colorDoc, val, fb));
      }
    }
  }
  for (const child of root.children) sanitizeCloneColors(child, colorDoc);
}

function isInvoiceCaptureTarget(element) {
  return (
    element.classList?.contains("erp-sale-invoice") ||
    element.classList?.contains("erp-purchase-invoice") ||
    Boolean(element.querySelector?.(".erp-sale-invoice")) ||
    Boolean(element.querySelector?.(".erp-purchase-invoice"))
  );
}

function injectCaptureStyles(frameDoc, css) {
  const style = frameDoc.createElement("style");
  style.textContent = css;
  frameDoc.head.appendChild(style);
}

/** Deep clone preserving class names — used with injected capture CSS. */
function cloneWithClasses(source, targetDoc) {
  if (source.nodeType === Node.TEXT_NODE) {
    return targetDoc.createTextNode(source.textContent);
  }
  if (!(source instanceof Element)) {
    return targetDoc.createDocumentFragment();
  }

  const clone = targetDoc.createElement(source.tagName.toLowerCase());
  if (source.id) clone.id = source.id;
  if (source.className) clone.className = source.className;

  for (const attr of source.attributes) {
    if (attr.name === "class" || attr.name === "id") continue;
    if (attr.name.startsWith("on")) continue;
    clone.setAttribute(attr.name, attr.value);
  }

  for (const child of source.childNodes) {
    const clonedChild = cloneWithClasses(child, targetDoc);
    if (clonedChild) clone.appendChild(clonedChild);
  }

  return clone;
}

function buildSafeCloneTree(source, targetDoc, colorDoc) {
  if (source.nodeType === Node.TEXT_NODE) {
    return targetDoc.createTextNode(source.textContent);
  }
  if (!(source instanceof Element)) {
    return targetDoc.createDocumentFragment();
  }

  const clone = targetDoc.createElement(source.tagName.toLowerCase());
  applySafeComputedStyles(source, clone, colorDoc);

  for (const child of source.childNodes) {
    const clonedChild = buildSafeCloneTree(child, targetDoc, colorDoc);
    if (clonedChild) clone.appendChild(clonedChild);
  }

  return clone;
}

function resolveCaptureTarget(element) {
  if (!element) return null;
  if (
    element.classList?.contains("erp-document-bill") ||
    element.classList?.contains("erp-sale-invoice") ||
    element.classList?.contains("erp-purchase-invoice")
  ) {
    return element;
  }
  return (
    element.querySelector(".erp-sale-invoice") ||
    element.querySelector(".erp-purchase-invoice") ||
    element.querySelector(".erp-document-bill") ||
    element
  );
}

async function renderInvoiceCanvas(target, scale) {
  const doc = target.ownerDocument;
  const useInvoiceStyles = isInvoiceCaptureTarget(target);

  const iframe = doc.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:-10000px;top:0;width:800px;height:2400px;border:0;opacity:0;pointer-events:none;";
  doc.body.appendChild(iframe);

  const frameDoc = iframe.contentDocument;
  if (!frameDoc) {
    iframe.remove();
    throw new Error("Could not create PDF frame");
  }

  frameDoc.open();
  frameDoc.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#fff"></body></html>'
  );
  frameDoc.close();

  if (useInvoiceStyles) {
    injectCaptureStyles(frameDoc, DOCUMENT_CAPTURE_CSS);
  }

  const w = target.scrollWidth || target.offsetWidth;
  const h = target.scrollHeight || target.offsetHeight;

  const safeRoot = useInvoiceStyles
    ? cloneWithClasses(target, frameDoc)
    : buildSafeCloneTree(target, frameDoc, doc);

  safeRoot.style.width = `${w}px`;
  safeRoot.style.maxWidth = `${w}px`;
  if (!useInvoiceStyles) sanitizeCloneColors(safeRoot, doc);
  frameDoc.body.appendChild(safeRoot);

  try {
    return await html2canvas(safeRoot, {
      scale,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: w,
      height: h,
      windowWidth: w,
      windowHeight: Math.max(h, 400),
      scrollX: 0,
      scrollY: 0,
      foreignObjectRendering: false,
      window: frameDoc.defaultView,
      onclone: (clonedDoc) => {
        if (!useInvoiceStyles) sanitizeCloneColors(clonedDoc.body, doc);
      },
    });
  } finally {
    iframe.remove();
  }
}

function addCanvasToA4Pdf(pdf, canvas, contentWidthMm) {
  const margin = 10;
  const pageHeight = 297;
  const pageInnerHeight = pageHeight - margin * 2;

  const imgWidth = contentWidthMm;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL("image/png");

  let offsetY = 0;
  let pageIndex = 0;

  while (offsetY < imgHeight - 0.5) {
    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(imgData, "PNG", margin, margin - offsetY, imgWidth, imgHeight);
    offsetY += pageInnerHeight;
    pageIndex += 1;
    if (pageIndex > 50) break;
  }
}

/**
 * Export a receipt DOM node as PDF (A4 pages; pass widthMm: 80 for narrow thermal layout).
 */
export async function downloadReceiptPdf(element, filename = "receipt.pdf", options = {}) {
  const target = resolveCaptureTarget(element);
  if (!target) throw new Error("Receipt element not found");

  if (target.offsetHeight < 8 || target.offsetWidth < 8) {
    throw new Error("Invoice is still loading — try again in a moment");
  }

  const contentWidthMm = options.widthMm ?? 190;

  let canvas;
  try {
    canvas = await renderInvoiceCanvas(target, 2);
  } catch (firstErr) {
    try {
      canvas = await renderInvoiceCanvas(target, 1);
    } catch (secondErr) {
      console.error("html2canvas failed:", firstErr, secondErr);
      throw new Error("Could not render invoice for PDF");
    }
  }

  if (!canvas.width || !canvas.height) {
    throw new Error("Could not render invoice for PDF");
  }

  const maxSide = 8192;
  if (canvas.width > maxSide || canvas.height > maxSide) {
    throw new Error("Invoice is too large to export — contact admin");
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  addCanvasToA4Pdf(pdf, canvas, contentWidthMm);
  pdf.save(filename);
}

/** Capture invoice DOM as PNG blob (for WhatsApp clipboard). */
export async function captureInvoiceImage(element) {
  const target = resolveCaptureTarget(element);
  if (!target) throw new Error("Invoice element not found");

  if (target.offsetHeight < 8 || target.offsetWidth < 8) {
    throw new Error("Invoice is still loading — try again in a moment");
  }

  let canvas;
  try {
    canvas = await renderInvoiceCanvas(target, 2);
  } catch {
    canvas = await renderInvoiceCanvas(target, 1);
  }

  if (!canvas?.width || !canvas?.height) {
    throw new Error("Could not capture invoice image");
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create image"))),
      "image/png",
      1
    );
  });
}

/** Wait until invoice bill node has layout (modal open animation). */
export async function waitForInvoiceElement(container, maxMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const target = resolveCaptureTarget(container);
    if (target && target.offsetHeight > 20 && target.offsetWidth > 20) {
      return target;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  return resolveCaptureTarget(container);
}

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

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
];

const UNSUPPORTED_COLOR = /lab\(|oklch\(|lch\(|color\(/i;

/** Resolve any CSS color (including lab/oklch) to #rrggbb for html2canvas. */
function resolveColorToHex(doc, colorValue, fallback = "#000000") {
  if (!colorValue || colorValue === "transparent" || colorValue === "rgba(0, 0, 0, 0)") {
    return colorValue || fallback;
  }

  const canvas = doc.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    try {
      ctx.fillStyle = fallback;
      ctx.fillStyle = colorValue;
      const resolved = ctx.fillStyle;
      if (resolved && !UNSUPPORTED_COLOR.test(resolved)) return resolved;
    } catch {
      /* probe fallback */
    }
  }

  if (!UNSUPPORTED_COLOR.test(colorValue)) {
    return colorValue;
  }

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

  if (ctx && rgb && UNSUPPORTED_COLOR.test(rgb)) {
    try {
      ctx.fillStyle = rgb;
      return ctx.fillStyle;
    } catch {
      return fallback;
    }
  }

  return UNSUPPORTED_COLOR.test(rgb) ? fallback : rgb;
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
    const safe = resolveColorToHex(colorDoc, value, prop.includes("background") ? "#ffffff" : "#0f172a");
    clone.style.setProperty(prop, safe);
  }

  const borderWidth = computed.getPropertyValue("border-width");
  const borderStyle = computed.getPropertyValue("border-style");
  if (borderWidth && borderWidth !== "0px") {
    const bc = resolveColorToHex(colorDoc, computed.getPropertyValue("border-top-color"), "#e2e8f0");
    clone.style.setProperty("border", `${borderWidth} ${borderStyle || "solid"} ${bc}`);
  }

  clone.style.setProperty("box-shadow", "none");
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
  return element.classList?.contains("erp-document-bill")
    ? element
    : element.querySelector(".erp-document-bill") || element;
}

async function renderInvoiceCanvas(target, scale) {
  const doc = target.ownerDocument;

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

  const w = target.scrollWidth || target.offsetWidth;
  const h = target.scrollHeight || target.offsetHeight;

  const safeRoot = buildSafeCloneTree(target, frameDoc, doc);
  safeRoot.style.width = `${w}px`;
  safeRoot.style.maxWidth = `${w}px`;
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

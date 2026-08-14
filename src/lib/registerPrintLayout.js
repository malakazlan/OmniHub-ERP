/** Shared column sizing for register print HTML + PDF exports. */

export const SERIAL_MM = 8;
export const SERIAL_PCT = 3.5;

export function layoutRegisterColumns(columns = [], tableWidthMm = 277) {
  const weights = columns.map((c) => Number(c.pdfWidth || c.width) || 24);
  const weightSum = weights.reduce((sum, w) => sum + w, 0) || 1;
  const dataWidthMm = tableWidthMm - SERIAL_MM;
  const dataPct = 100 - SERIAL_PCT;

  return {
    serialMm: SERIAL_MM,
    serialPct: SERIAL_PCT,
    columns: columns.map((col, i) => ({
      ...col,
      widthMm: (weights[i] / weightSum) * dataWidthMm,
      widthPct: (weights[i] / weightSum) * dataPct,
    })),
  };
}

/** Normalize footer config and resolve which columns hold label vs value. */
export function normalizeRegisterFooter(footers = [], columns = []) {
  if (!footers.length || !columns.length) return null;

  const meta = footers.find((f) => f.valueColumn || f.labelColumn) || footers[0];

  let label = "Total";
  let value = "";

  if (footers.length === 1) {
    label = footers[0].label || label;
    value = footers[0].value ?? value;
  } else {
    const labelPart = footers.find((f) => f.label && f.label !== "");
    const valuePart = footers.find((f) => f.value != null && f.value !== "");
    label = labelPart?.label || label;
    value = valuePart?.value ?? value;
  }

  if (value == null || value === "") return null;

  let valueColumn = meta.valueColumn;
  let labelColumn = meta.labelColumn;

  if (!valueColumn) {
    valueColumn = columns[columns.length - 1]?.key;
  }

  const valueIdx = columns.findIndex((c) => c.key === valueColumn);
  const resolvedValueIdx = valueIdx >= 0 ? valueIdx : columns.length - 1;
  valueColumn = columns[resolvedValueIdx]?.key;

  if (!labelColumn) {
    labelColumn = resolvedValueIdx > 0 ? columns[resolvedValueIdx - 1]?.key : columns[0]?.key;
  }

  const labelIdx = columns.findIndex((c) => c.key === labelColumn);
  const resolvedLabelIdx = labelIdx >= 0 ? labelIdx : Math.max(0, resolvedValueIdx - 1);

  return {
    label,
    value,
    valueIdx: resolvedValueIdx,
    labelIdx: resolvedLabelIdx,
  };
}

export function formatPrintCompanyMeta(company) {
  const c = company && typeof company === "object" ? company : {};
  const lines = [];
  if (c.address) lines.push(c.address);
  if (c.phone) lines.push(`Tel: ${c.phone}`);
  return lines;
}

const PAYMENT_TOLERANCE = 0.01;

/** Sale has no linked shop, company, or farmer — treated as walk-in. */
export function isWalkInSaleOrder(sale) {
  return !sale?.shopId && !sale?.companyId && !sale?.farmerId;
}

export function isWalkInCustomerType(customerType) {
  return customerType === "walkin";
}

export function isWalkInSale({ customerType, shopId, companyId, farmerId } = {}) {
  if (isWalkInCustomerType(customerType)) return true;
  return !shopId && !companyId && !farmerId;
}

/** Returns an error message when walk-in confirm is not fully paid, else null. */
export function validateWalkInFullPayment({
  customerType,
  shopId,
  companyId,
  farmerId,
  status,
  paidAmount,
  totalAmount,
  cashAmount = 0,
  bankAmount = 0,
  cashAccountId,
  bankAccountId,
}) {
  if (!isWalkInSale({ customerType, shopId, companyId, farmerId })) return null;
  if (status !== "confirmed") return null;

  if (totalAmount <= 0) return "Sale total must be greater than zero";

  if (paidAmount + PAYMENT_TOLERANCE < totalAmount) {
    return "Walk-in sales must be paid in full (cash and/or bank)";
  }

  if (cashAmount > 0 && !cashAccountId) {
    return "Select a cash account for this payment";
  }
  if (bankAmount > 0 && !bankAccountId) {
    return "Select a bank account for this payment";
  }

  return null;
}

/** Display name on invoices — walk-in with no name shows em dash. */
export function saleCustomerDisplayName(sale) {
  const name = sale?.customerName?.trim();
  if (!name || name === "—" || name === "-") return "—";
  return name;
}

export function saleCustomerTypeLabel(sale) {
  if (sale?.farmerId) return "Farmer";
  if (sale?.shopId) return "Shop";
  if (sale?.companyId) return "Company";
  return "Walk-in";
}

export function saleCustomerPhone(sale) {
  return sale?.shop?.phone || sale?.company?.phone || sale?.farmer?.phone || "";
}

/** Prefer WhatsApp number; fall back to mobile. */
export function pickContactPhone(whatsappNumber, phone) {
  const wa = whatsappNumber?.trim();
  if (wa) return wa;
  const ph = phone?.trim();
  return ph || null;
}

export function getSaleWhatsAppPhone(sale) {
  if (!sale) return null;
  if (sale.shop) {
    return pickContactPhone(sale.shop.whatsappNumber, sale.shop.phone);
  }
  if (sale.company) {
    return pickContactPhone(sale.company.whatsappNumber, sale.company.phone);
  }
  if (sale.farmer) {
    return pickContactPhone(sale.farmer.whatsappNumber, sale.farmer.phone);
  }
  return null;
}

export function getPurchaseWhatsAppPhone(purchase) {
  if (!purchase) return null;
  if (purchase.farmer) {
    return pickContactPhone(purchase.farmer.whatsappNumber, purchase.farmer.phone);
  }
  if (purchase.company) {
    return pickContactPhone(purchase.company.whatsappNumber, purchase.company.phone);
  }
  return null;
}

export function getPaymentReceiptWhatsAppPhone(receipt) {
  if (!receipt) return null;
  return receipt.partyWhatsApp || receipt.partyPhone || null;
}

/** Strip cross-user fields from order payloads for staff who only see their own orders. */
import { mustScopeOrdersToSelf } from "@/lib/ordersNav";

export function sanitizeCustomerOrder(order, user) {
  if (!order) return order;
  const scoped = mustScopeOrdersToSelf(user);
  if (!scoped) return order;

  const { createdBy, reviewedBy, saleOrder, ...rest } = order;
  return {
    ...rest,
    reviewedBy: reviewedBy ? { name: reviewedBy.name } : null,
    saleOrder: saleOrder
      ? { id: saleOrder.id, invoiceNumber: saleOrder.invoiceNumber, status: saleOrder.status }
      : null,
  };
}

export function sanitizeCustomerOrders(orders, user) {
  return (orders || []).map((o) => sanitizeCustomerOrder(o, user));
}

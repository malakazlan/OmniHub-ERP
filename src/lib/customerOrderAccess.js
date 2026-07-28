const ADMIN_ROLES = ["admin", "manager"];

export function parseUserModules(user) {
  if (!user) return [];
  if (Array.isArray(user.allowedModules)) return user.allowedModules;
  try {
    return JSON.parse(user.allowedModules || "[]");
  } catch {
    return [];
  }
}

export function hasOrdersModule(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return parseUserModules(user).includes("orders");
}

export function canViewOrders(user) {
  return hasOrdersModule(user) || ADMIN_ROLES.includes(user?.role);
}

export function canCreateOrder(user) {
  if (!user) return false;
  if (user.role === "admin" || user.role === "manager") return true;
  if (!hasOrdersModule(user)) return false;
  return user.role === "salesperson" || parseUserModules(user).includes("orders");
}

export function canEditOrder(user, order) {
  if (!user || !order) return false;
  if (user.role === "admin" || user.role === "manager") {
    return order.status === "pending" || order.status === "accepted";
  }
  if (!hasOrdersModule(user)) return false;
  if (order.status !== "pending" && order.status !== "accepted") return false;
  if (user.role === "salesperson") {
    return order.createdById === user.userId;
  }
  return false;
}

export function canDeleteOrder(user, order) {
  return canEditOrder(user, order);
}

export function canReviewOrder(user) {
  return user && (user.role === "admin" || user.role === "manager");
}

export function canConvertOrder(user, order) {
  if (!canReviewOrder(user)) return false;
  return order?.status === "accepted" && !order?.saleOrderId;
}

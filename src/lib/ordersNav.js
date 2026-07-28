/** Admin/manager see all orders; everyone else only their own. */
export function mustScopeOrdersToSelf(user) {
  if (!user) return true;
  return user.role !== "admin" && user.role !== "manager";
}

export function ordersHomePath(user) {
  if (!user) return "/orders";
  return mustScopeOrdersToSelf(user) ? "/orders/my" : "/orders";
}

export function ordersNewPath(user) {
  return mustScopeOrdersToSelf(user) ? "/orders/my/new" : "/orders/new";
}

export function orderDetailPath(user, orderId) {
  return mustScopeOrdersToSelf(user) ? `/orders/my/${orderId}` : `/orders/${orderId}`;
}

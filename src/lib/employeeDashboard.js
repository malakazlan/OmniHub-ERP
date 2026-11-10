/** Admin/manager see the operations dashboard; staff see the employee portal. */
export function usesEmployeeDashboard(user) {
  if (!user) return false;
  return user.role !== "admin" && user.role !== "manager";
}

export function employeeRoleLabel(role) {
  const labels = {
    salesperson: "Sales Rep",
    driver: "Driver",
    accountant: "Accounting",
    viewer: "Viewer",
    admin: "Administrator",
    manager: "Manager",
  };
  return labels[role] || role?.replace(/_/g, " ") || "Staff";
}

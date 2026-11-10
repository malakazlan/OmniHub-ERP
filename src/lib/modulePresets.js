import { VISIBLE_MODULES } from "./constants";

/** Default module access when creating a login by system role */
export function defaultModulesForRole(role) {
  switch (role) {
    case "admin":
      return [...VISIBLE_MODULES];
    case "manager":
      return VISIBLE_MODULES.filter((m) => m !== "settings");
    case "salesperson":
      return ["dashboard", "companies", "products", "orders", "sales", "transport"];
    case "accountant":
      return ["dashboard", "accounts", "reports", "purchases", "sales", "companies"];
    case "driver":
      return ["dashboard", "transport"];
    case "viewer":
      return ["dashboard", "reports"];
    default:
      return ["dashboard"];
  }
}

/** Map HR employee role to login role */
export function loginRoleFromEmployeeRole(employeeRole) {
  switch (employeeRole) {
    case "salesperson":
      return "salesperson";
    case "accountant":
      return "accountant";
    case "manager":
      return "manager";
    case "driver":
      return "driver";
    default:
      return "viewer";
  }
}

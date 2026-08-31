import { MODULES } from "./constants";

/** Default module access when creating a login by system role */
export function defaultModulesForRole(role) {
  switch (role) {
    case "admin":
      return [...MODULES];
    case "manager":
      return MODULES.filter((m) => m !== "settings");
    case "salesperson":
      return ["dashboard", "shops", "dealers", "products", "orders", "sales", "transport"];
    case "accountant":
      return ["dashboard", "accounts", "reports", "purchases", "sales", "dealers", "shops"];
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

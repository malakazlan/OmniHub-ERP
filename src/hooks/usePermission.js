"use client";

import { useAuth } from "@/context/AuthContext";

export default function usePermission() {
  const { user, hasModuleAccess } = useAuth();

  const can = (action, moduleSlug) => {
    if (!user) return false;
    if (user.role === "admin") return true;

    // View-only role restriction
    if (user.role === "viewer" && action !== "view") return false;

    // Check module level access
    if (moduleSlug && !hasModuleAccess(moduleSlug)) return false;

    switch (user.role) {
      case "manager":
        // Managers can do almost everything except settings/user management
        if (moduleSlug === "settings" && action !== "view") return false;
        return true;

      case "accountant":
        // Accountants can only view entities, but manage accounting and payments
        if (["accounts", "payments", "expenses", "day-close"].includes(moduleSlug)) {
          return true;
        }
        return action === "view";

      case "salesperson":
        // Salespersons can view/create sales/shops/products/orders, own records
        if (moduleSlug === "sales" || moduleSlug === "shops" || moduleSlug === "orders") {
          return action === "create" || action === "view" || action === "edit" || action === "delete";
        }
        if (moduleSlug === "products" || moduleSlug === "farmers" || moduleSlug === "companies" || moduleSlug === "transport") {
          return action === "view";
        }
        return false;

      case "driver":
        // Drivers only view transport
        return moduleSlug === "transport" && action === "view";

      default:
        return false;
    }
  };

  return { can, user };
}

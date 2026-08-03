"use client";

import { useAuth } from "@/context/AuthContext";

/** Logged-in user's assigned primary cash account id (string), or "". */
export function useDefaultCashAccountId() {
  const { user } = useAuth();
  return user?.cashAccountId ? String(user.cashAccountId) : "";
}

/** Merge user's default cash account into form state when not already set. */
export function applyDefaultCashAccount(form, defaultCashAccountId) {
  if (!defaultCashAccountId || form.cashAccountId) return form;
  return { ...form, cashAccountId: defaultCashAccountId };
}

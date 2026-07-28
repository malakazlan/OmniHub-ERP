"use client";

import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { readStoredAuthUser, writeStoredAuthUser } from "@/lib/sessionUser";

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  hasModuleAccess: () => false,
});

const ME_TIMEOUT_MS = 8000;

async function clearSessionCookie() {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const bootstrapped = useRef(false);

  const applyUser = useCallback((next) => {
    setUser(next);
    writeStoredAuthUser(next);
  }, []);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ME_TIMEOUT_MS);

    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        signal: controller.signal,
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        applyUser(data.user);
        return data.user;
      }
      applyUser(null);
      if (res.status === 401) await clearSessionCookie();
      return null;
    } catch (err) {
      if (err?.name === "AbortError") {
        console.warn("Auth check timed out — is MySQL running?");
      }
      const cached = readStoredAuthUser();
      if (cached) return cached;
      applyUser(null);
      return null;
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, [applyUser]);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const cached = readStoredAuthUser();
    if (cached) setUser(cached);

    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }

    applyUser(data.user);
    setLoading(false);
    router.replace("/dashboard");
    return data.user;
  };

  const logout = async () => {
    await clearSessionCookie();
    applyUser(null);
    setLoading(false);
    router.replace("/login");
  };

  const hasModuleAccess = (moduleSlug) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return user.allowedModules?.includes(moduleSlug) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        checkAuth,
        hasModuleAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

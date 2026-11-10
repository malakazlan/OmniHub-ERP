"use client";

import React, { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "omnihub-theme";
const listeners = new Set();

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* storage unavailable */
  }
  return null;
}

function systemTheme() {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
}

function notify() {
  listeners.forEach((cb) => cb());
}

/** Current theme as rendered on <html> (the inline init script sets it before hydration). */
function getSnapshot() {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  const initial = readStoredTheme() || systemTheme();
  applyTheme(initial);
  return initial;
}

function getServerSnapshot() {
  return "light";
}

function subscribe(callback) {
  listeners.add(callback);
  let mq = null;
  const onSystemChange = () => {
    // Follow the OS only while the user has not chosen explicitly.
    if (readStoredTheme()) return;
    applyTheme(systemTheme());
    notify();
  };
  const onStorage = (e) => {
    if (e.key && e.key !== STORAGE_KEY) return;
    applyTheme(readStoredTheme() || systemTheme());
    notify();
  };
  try {
    mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener?.("change", onSystemChange);
    window.addEventListener("storage", onStorage);
  } catch {
    /* matchMedia unavailable */
  }
  return () => {
    listeners.delete(callback);
    mq?.removeEventListener?.("change", onSystemChange);
    try {
      window.removeEventListener("storage", onStorage);
    } catch {
      /* ignore */
    }
  };
}

const ThemeContext = createContext({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

/**
 * Light / dark theme for Omni Hub.
 * - persisted in localStorage ("omnihub-theme")
 * - respects prefers-color-scheme until the user picks explicitly
 * - exposed as data-theme on <html> (tokens live in globals.css)
 */
export function ThemeProvider({ children }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next) => {
    const value = next === "dark" ? "dark" : "light";
    applyTheme(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* storage unavailable */
    }
    notify();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
  theme: "light",
  toggleTheme: () => {},
});

/** App stays light; only the sidebar is dark by design. */
export function ThemeProvider({ children }) {
  const [theme] = useState("light");

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("dark");
    localStorage.setItem("warraichtraders-theme", "light");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

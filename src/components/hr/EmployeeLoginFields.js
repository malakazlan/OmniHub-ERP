"use client";

import React from "react";
import { MODULES } from "@/lib/constants";
import ModuleAccessTabs from "@/components/settings/ModuleAccessTabs";
import { defaultModulesForRole } from "@/lib/modulePresets";

const LOGIN_ROLES = ["salesperson", "manager", "accountant", "driver", "viewer"];

export default function EmployeeLoginFields({ form, setForm, isEdit = false, hasLinkedLogin = false }) {
  const showLoginBlock = isEdit
    ? hasLinkedLogin || form.createLogin
    : form.createLogin;

  const setLoginRole = (loginRole) => {
    setForm({
      ...form,
      loginRole,
      allowedModules: loginRole === "admin" ? [...MODULES] : defaultModulesForRole(loginRole),
    });
  };

  if (isEdit && !hasLinkedLogin && !form.createLogin) {
    return (
      <div className="space-y-3 p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/80">
        <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-slate-700">
          <input
            type="checkbox"
            checked={!!form.createLogin}
            onChange={(e) => setForm({ ...form, createLogin: e.target.checked })}
          />
          Add system login for this employee
        </label>
      </div>
    );
  }

  if (!isEdit && !form.createLogin) {
    return null;
  }

  return (
    <div className="space-y-3 p-3 rounded-xl border border-slate-200 bg-slate-50/80">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">System login</p>

      {!isEdit && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.createLogin}
            onChange={(e) => setForm({ ...form, createLogin: e.target.checked })}
          />
          Create login (email & password)
        </label>
      )}

      {showLoginBlock && (
        <>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-slate-500">Login email *</label>
            <input
              className="input-field"
              type="email"
              value={form.loginEmail || ""}
              onChange={(e) => setForm({ ...form, loginEmail: e.target.value })}
              required={showLoginBlock}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-slate-500">
              {isEdit ? "New password (leave blank to keep)" : "Login password *"}
            </label>
            <input
              className="input-field"
              type="password"
              value={form.loginPassword || ""}
              onChange={(e) => setForm({ ...form, loginPassword: e.target.value })}
              required={!isEdit && showLoginBlock}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-slate-500">Login role</label>
            <select
              className="input-field"
              value={form.loginRole || "viewer"}
              onChange={(e) => setLoginRole(e.target.value)}
            >
              {LOGIN_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.loginIsActive !== false}
              onChange={(e) => setForm({ ...form, loginIsActive: e.target.checked })}
            />
            Login account active
          </label>
          <ModuleAccessTabs
            selected={form.allowedModules || []}
            onChange={(mods) => setForm({ ...form, allowedModules: mods })}
            disabled={form.loginRole === "admin"}
          />
        </>
      )}
    </div>
  );
}

export function emptyLoginFormFields(loginRole = "salesperson") {
  return {
    createLogin: false,
    loginEmail: "",
    loginPassword: "",
    loginRole,
    allowedModules: defaultModulesForRole(loginRole),
    loginIsActive: true,
  };
}

export function loginFormFromUser(loginUser) {
  if (!loginUser) {
    return { ...emptyLoginFormFields(), createLogin: false };
  }
  return {
    createLogin: false,
    loginEmail: loginUser.email || "",
    loginPassword: "",
    loginRole: loginUser.role || "viewer",
    allowedModules: Array.isArray(loginUser.allowedModules)
      ? loginUser.allowedModules
      : defaultModulesForRole(loginUser.role),
    loginIsActive: loginUser.isActive !== false,
  };
}

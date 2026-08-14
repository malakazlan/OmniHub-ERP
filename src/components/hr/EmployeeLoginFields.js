"use client";

import React from "react";
import { KeyRound, Shield } from "lucide-react";
import { MODULES } from "@/lib/constants";
import ModuleAccessTabs from "@/components/settings/ModuleAccessTabs";
import { defaultModulesForRole } from "@/lib/modulePresets";

const LOGIN_ROLES = ["salesperson", "manager", "accountant", "driver", "viewer"];

export default function EmployeeLoginFields({ form, setForm, isEdit = false, hasLinkedLogin = false }) {
  const showLoginBlock = isEdit ? hasLinkedLogin || form.createLogin : form.createLogin;

  const setLoginRole = (loginRole) => {
    setForm({
      ...form,
      loginRole,
      allowedModules: loginRole === "admin" ? [...MODULES] : defaultModulesForRole(loginRole),
    });
  };

  if (isEdit && !hasLinkedLogin && !form.createLogin) {
    return (
      <div className="erp-hr-login-panel erp-hr-login-panel-empty">
        <div className="erp-hr-login-panel-icon">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <p className="erp-hr-login-panel-title">No portal login yet</p>
          <p className="erp-hr-login-panel-desc">
            Enable below to create email/password credentials and choose which modules this employee can access.
          </p>
        </div>
        <label className="erp-hr-check erp-hr-check-block">
          <input
            type="checkbox"
            checked={!!form.createLogin}
            onChange={(e) => setForm({ ...form, createLogin: e.target.checked })}
          />
          Assign system login for this employee
        </label>
      </div>
    );
  }

  if (!isEdit && !form.createLogin) {
    return (
      <div className="erp-finance-form-section">
        <p className="erp-finance-section-label">Portal login (optional)</p>
        <div className="erp-hr-login-panel erp-hr-login-panel-empty">
          <label className="erp-hr-check erp-hr-check-block">
            <input
              type="checkbox"
              checked={!!form.createLogin}
              onChange={(e) => setForm({ ...form, createLogin: e.target.checked })}
            />
            Create login with email & password now
          </label>
          <p className="erp-hr-login-panel-desc">
            Skip this to register the employee without system access — you can assign login later from their profile.
          </p>
        </div>
      </div>
    );
  }

  if (!isEdit && !showLoginBlock) {
    return null;
  }

  return (
    <div className="erp-finance-form-section">
      <p className="erp-finance-section-label flex items-center gap-2">
        <Shield className="w-3.5 h-3.5" />
        {hasLinkedLogin ? "Login credentials & access" : "New login credentials"}
      </p>
      <div className="erp-finance-form-grid">
        <div className="erp-finance-field erp-finance-field-span2">
          <label className="erp-finance-label">Login email *</label>
          <input
            className="erp-finance-input"
            type="email"
            value={form.loginEmail || ""}
            onChange={(e) => setForm({ ...form, loginEmail: e.target.value })}
            required={showLoginBlock}
            autoComplete="off"
          />
        </div>
        <div className="erp-finance-field erp-finance-field-span2">
          <label className="erp-finance-label">
            {hasLinkedLogin ? "New password (leave blank to keep current)" : "Login password *"}
          </label>
          <input
            className="erp-finance-input"
            type="password"
            value={form.loginPassword || ""}
            onChange={(e) => setForm({ ...form, loginPassword: e.target.value })}
            required={!isEdit && form.createLogin}
            autoComplete="new-password"
          />
        </div>
        <div className="erp-finance-field">
          <label className="erp-finance-label">System role</label>
          <select
            className="erp-finance-input"
            value={form.loginRole || "viewer"}
            onChange={(e) => setLoginRole(e.target.value)}
          >
            {LOGIN_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="erp-finance-field">
          <label className="erp-hr-check">
            <input
              type="checkbox"
              checked={form.loginIsActive !== false}
              onChange={(e) => setForm({ ...form, loginIsActive: e.target.checked })}
            />
            Login account active
          </label>
        </div>
        <div className="erp-finance-field erp-finance-field-span2">
          <ModuleAccessTabs
            selected={form.allowedModules || []}
            onChange={(mods) => setForm({ ...form, allowedModules: mods })}
            disabled={form.loginRole === "admin"}
          />
        </div>
      </div>
    </div>
  );
}

export function emptyLoginFormFields(loginRole = "viewer") {
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

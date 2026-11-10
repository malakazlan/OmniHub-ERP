/** Client-safe user shape returned by login / auth/me */
export function serializeAuthUser(user) {
  if (!user) return null;
  let allowedModules = user.allowedModules;
  if (typeof allowedModules === "string") {
    try {
      allowedModules = JSON.parse(allowedModules || "[]");
    } catch {
      allowedModules = [];
    }
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar ?? null,
    phone: user.phone ?? null,
    cashAccountId: user.cashAccountId ?? null,
    allowedModules: Array.isArray(allowedModules) ? allowedModules : [],
  };
}

export const AUTH_COOKIE_NAME = "omnihub_session";
export const AUTH_USER_STORAGE_KEY = "omnihub_auth_user";

export function readStoredAuthUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AUTH_USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeStoredAuthUser(user) {
  if (typeof window === "undefined") return;
  try {
    if (user) sessionStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

export function hasAuthCookieClient() {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => {
    const t = part.trim();
    return t.startsWith(`${AUTH_COOKIE_NAME}=`) && t.length > AUTH_COOKIE_NAME.length + 1;
  });
}

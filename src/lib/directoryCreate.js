/**
 * Party / project accounts must be created from Accounts → Project Accounts only.
 */
export function directoryCreateBlocked(body) {
  if (body?.fromDirectory === true) return null;
  return Response.json(
    {
      error:
        "Create this account from Chart of Accounts (Accounting → Chart of Accounts). Other pages are for transactions and viewing only.",
    },
    { status: 403 }
  );
}

/** Project Accounts register / manage — admin only */
export function requireProjectAccountsAdmin(user) {
  if (user?.role === "admin") return null;
  return Response.json(
    { error: "Only admin can register or change project accounts." },
    { status: 403 }
  );
}

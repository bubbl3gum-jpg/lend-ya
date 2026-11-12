/** Browser-safe parsing only. Eligibility, expiry and single use remain server decisions. */
export function recoveryTokenFromFragment(fragment: string): string | null {
  const params = new URLSearchParams(fragment.startsWith("#") ? fragment.slice(1) : "");
  if (params.size !== 1 || params.getAll("token").length !== 1) return null;
  const token = params.get("token");
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  try {
    const bytes = atob(token.replace(/-/g, "+").replace(/_/g, "/") + "=");
    const canonical = btoa(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return bytes.length === 32 && canonical === token ? token : null;
  } catch { return null; }
}

import { NextResponse, type NextRequest } from "next/server";
export function proxy(request: NextRequest) {
  if ((request.nextUrl.pathname === "/api/dev/staff-listing-read" || request.nextUrl.pathname === "/dev/staff-listing-inspection") &&
    (process.env.NODE_ENV !== "development" || process.env.HUSTLEN_STAFF_READ_PILOT !== "owned-synthetic-only"))
    return NextResponse.json({error:"Not found."},{status:404,headers:{"Cache-Control":"private, no-store"}});
  // Refuse unfinished pilot surfaces before rendering/streaming or database access.
  if ((request.nextUrl.pathname === "/api/auth/admin-passkeys" ||
    request.nextUrl.pathname === "/admin/security" || request.nextUrl.pathname.startsWith("/admin/security/")) &&
    (process.env.NODE_ENV !== "development" || process.env.HUSTLEN_PASSKEY_PILOT !== "owned-development-only"))
    return NextResponse.json({ error: "Not found." }, { status: 404,
      headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin"),
      host = request.headers.get("host") ?? request.nextUrl.host;
    let allowed = true;
    if (origin) {
      try {
        const source = new URL(origin);
        allowed =
          ["http:", "https:"].includes(source.protocol) && source.host === host;
      } catch {
        allowed = false;
      }
    }
    if (!allowed || request.headers.get("sec-fetch-site") === "cross-site")
      return NextResponse.json(
        { error: "Cross-origin mutations are forbidden." },
        { status: 403, headers: { "Cache-Control": "private, no-store" } },
      );
  }
  const legacy = request.nextUrl.pathname.startsWith("/uploads/listings/");
  const response = legacy
    ? NextResponse.rewrite(
        new URL(
          `/api/listing-media/${encodeURIComponent(request.nextUrl.pathname.slice("/uploads/listings/".length))}`,
          request.url,
        ),
      )
    : NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
export const config = { matcher: ["/api/:path*", "/uploads/listings/:path*", "/admin/security/:path*", "/admin/account-security/:path*", "/dev/staff-listing-inspection"] };

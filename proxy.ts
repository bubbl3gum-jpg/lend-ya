import { NextResponse, type NextRequest } from "next/server";
export function proxy(request: NextRequest) {
  if ((request.nextUrl.pathname.startsWith("/api/admin/locations/lab") || request.nextUrl.pathname==="/admin/locations/lab" || request.nextUrl.pathname.startsWith("/admin/locations/lab/")) && (process.env.NODE_ENV!=="development" || process.env.HUSTLEN_GEOFENCING_LAB!=="owned-self-only"))
    return NextResponse.json({error:"Not found."},{status:404,headers:{"Cache-Control":"private, no-store"}});
  if ((["/api/dev/support-agent","/api/dev/support-requester","/dev/support-agent","/dev/support-requester"].some(path=>request.nextUrl.pathname===path || request.nextUrl.pathname.startsWith(path+"/"))) && (process.env.NODE_ENV !== "development" || process.env.HUSTLEN_SUPPORT_STAFF_CANDIDATE !== "owned-synthetic-only"))
    return NextResponse.json({error:"Not found."},{status:404,headers:{"Cache-Control":"private, no-store"}});
  if ((request.nextUrl.pathname.startsWith("/api/support/channels") || /^\/api\/support\/tickets\/[^/]+\/channel(?:\/|$)/.test(request.nextUrl.pathname) || /^\/customer-service\/tickets\/[^/]+\/channel(?:\/|$)/.test(request.nextUrl.pathname)) && (process.env.NODE_ENV !== "development" || process.env.HUSTLEN_SUPPORT_CHANNEL_CANDIDATE !== "owned-requester-only"))
    return NextResponse.json({error:"Not found."},{status:404,headers:{"Cache-Control":"private, no-store"}});
  if ((request.nextUrl.pathname.startsWith("/api/support/tickets") || request.nextUrl.pathname.startsWith("/customer-service/tickets")) && (process.env.NODE_ENV !== "development" || process.env.HUSTLEN_SUPPORT_TICKET_CANDIDATE !== "owned-development-only"))
    return NextResponse.json({error:"Not found."},{status:404,headers:{"Cache-Control":"private, no-store"}});
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
export const config = { matcher: ["/admin/locations/:path*", "/dev/support-agent/:path*", "/dev/support-requester/:path*", "/api/:path*", "/customer-service/tickets/:path*", "/uploads/listings/:path*", "/admin/security/:path*", "/admin/account-security/:path*", "/admin/workbench/:path*", "/admin/support/:path*", "/admin/bookings/:path*", "/admin/listings/:path*", "/admin/reports/:path*", "/admin/case-audit/:path*", "/admin/disputes/:path*", "/dev/staff-listing-inspection"] };

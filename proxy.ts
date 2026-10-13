import { NextResponse, type NextRequest } from "next/server";
export function proxy(request: NextRequest) {
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
export const config = { matcher: ["/api/:path*", "/uploads/listings/:path*"] };

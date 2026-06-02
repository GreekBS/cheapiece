import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { normalizeRouteLabel } from "@/lib/observability/normalize-route";

/** `x-return-path` is optional UX context for login hints only; auth does not depend on it. */
export function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const pathname = request.nextUrl.pathname;
  const routeLabel = normalizeRouteLabel(pathname);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-route-label", routeLabel);
  requestHeaders.set("x-log-pathname", pathname);

  const returnPath = `${pathname}${request.nextUrl.search}`;
  if (returnPath.length <= 2048) {
    requestHeaders.set("x-return-path", returnPath);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

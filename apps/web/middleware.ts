import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Routes that are always publicly accessible (no auth required).
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/api/webhooks/(.*)",
  "/privacy",
  "/terms",
]);

/**
 * Routes that require the user to have an active subscription.
 * Checked after the auth guard passes.
 */
const isPaidRoute = createRouteMatcher([
  "/analytics(.*)",
  "/billing(.*)",
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Allow public routes without authentication
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protect all other routes — redirects to /login if unauthenticated
  const { userId, sessionClaims } = await auth.protect();

  // Optionally enforce subscription for paid routes
  // (publicMetadata set by webhook on Stripe checkout.session.completed)
  if (isPaidRoute(req)) {
    const plan =
      (sessionClaims?.publicMetadata as Record<string, string> | undefined)
        ?.plan ?? "free";

    if (plan === "free") {
      const billingUrl = new URL("/billing", req.url);
      billingUrl.searchParams.set("upgrade", "1");
      return NextResponse.redirect(billingUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  /*
   * Match all request paths except for Next.js internals and static assets.
   * Clerk recommends this pattern to avoid running middleware on static files.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

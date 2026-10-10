import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtected = createRouteMatcher([
  "/dashboard(.*)",
  "/notebook(.*)",
  "/heatmap(.*)",
  "/bookmarks(.*)",
  "/admin(.*)",
]);

// Routes Clerk needs to process auth — must never be protected
const isClerkInternal = createRouteMatcher([
  "/sso-callback(.*)",
  "/login(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isClerkInternal(request)) return; // let Clerk handle these freely
  if (isProtected(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

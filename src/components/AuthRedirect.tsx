"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "./providers";

/**
 * Redirects users based on their auth status.
 * - If not signed in and trying to access a protected route -> redirect to sign-in
 * - If signed in and trying to access sign-in/sign-up -> redirect to dashboard
 */
export function AuthRedirect() {
  const router = useRouter();
  const { userId, isSignedIn } = useApp();

  useEffect(() => {
    if (!isSignedIn) {
      // Not signed in - check if trying to access protected route
      const pathname = router.pathname as string;
      const protectedRoutes = [
        "/dashboard",
        "/notebook",
        "/heatmap",
        "/bookmarks",
        "/admin",
        "/practice",
        "/quiz",
        "/result",
        "/live-exams",
        "/challenge",
        "/premium"
      ];

      const isProtectedRoute = protectedRoutes.some(route =>
        pathname.startsWith(route) || pathname === route
      );

      if (isProtectedRoute) {
        // Redirect to sign-in with next param
        const url = new URL("/sign-in", window.location.origin);
        url.searchParams.set("next", pathname);
        window.location.href = url.toString();
      }
    } else {
      // Signed in - check if trying to access auth pages
      const pathname = router.pathname as string;
      if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
        // Redirect to dashboard
        router.push("/dashboard");
      }
    }
  }, [router, userId, isSignedIn]);

  // This component doesn't render anything - it just redirects
  return null;
}
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "./providers";

/**
 * Shows progress indicator at the top of the page during navigation.
 * Similar to YouTube's red progress bar.
 */
export function NavProgress() {
  const pathname = usePathname();
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Start progress
    setProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 10, 90));
    }, 50);

    // Complete when route changes
    const handleRouteChangeComplete = () => {
      setProgress(100);
      setTimeout(() => setProgress(0), 300);
    };

    router.events.on("routeChangeStart", () => setProgress(0));
    router.events.on("routeChangeComplete", handleRouteChangeComplete);
    router.events.on("routeChangeError", handleRouteChangeComplete);

    return () => {
      clearInterval(interval);
      router.events.off("routeChangeStart", () => setProgress(0));
      router.events.off("routeChangeComplete", handleRouteChangeComplete);
      router.events.off("routeChangeError", handleRouteChangeComplete);
    };
  }, [pathname, router]);

  if (progress === 0 || progress === 100) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 h-0.5 bg-maroon origin-left transition-transform duration-500"
      style={{ transform: `scaleX(${progress / 100})` }}
    />
  );
}
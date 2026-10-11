"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("gshub_cookie_consent");
      if (!consent) {
        setShow(true);
      }
    } catch {
      // ignore local storage errors
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem("gshub_cookie_consent", "accepted");
    } catch {
      // ignore
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent banner"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl transition-all sm:bottom-6 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-stone-600 sm:text-sm">
          We use functional cookies and local storage to remember your language preferences and save your quiz progress.{" "}
          <Link href="/cookies" className="text-maroon underline hover:text-maroon-800">
            Learn more
          </Link>.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleAccept}
            className="btn-primary !py-1.5 !px-4 text-xs font-semibold"
          >
            Accept &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
}

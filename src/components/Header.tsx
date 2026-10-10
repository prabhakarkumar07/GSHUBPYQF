"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import { Logo } from "./Logo";
import { LangToggle } from "./LangToggle";
import { useApp } from "./providers";
import { IconMenu, IconX } from "./icons";

export function Header() {
  const { t, user, isAdmin, profile } = useApp();
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/practice", label: t("nav_practice") },
    { href: "/dashboard", label: t("nav_dashboard") },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/notebook", label: t("nav_notebook") },
    { href: "/heatmap", label: t("nav_heatmap") },
    { href: "/bookmarks", label: t("nav_bookmarks") },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: t("nav_about") },
    ...(isAdmin ? [{ href: "/admin", label: t("nav_admin") }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-gold/30 bg-maroon-900/95 backdrop-blur-md text-white shadow-sm supports-[backdrop-filter]:bg-maroon-900/85">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-2 px-3 sm:px-5">
        <Logo light className="h-9 w-auto xl:h-11" />
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-lg px-2 py-2 text-[13px] font-medium transition hover:bg-white/10 xl:px-3 xl:text-sm ${path.startsWith(l.href) ? "text-gold-300" : "text-white/90"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5 xl:gap-2">
          <LangToggle compact />
          <div className="hidden lg:flex items-center gap-2">
            {user ? (
              <>
                <div className={profile?.subscription_tier === "premium" ? "rounded-full border-2 border-[#E5C158] shadow-[0_0_12px_rgba(229,193,88,0.6)] p-[2px] flex items-center justify-center" : "flex items-center justify-center p-[4px]"}><UserButton /></div>
                <SignOutButton redirectUrl="/">
                  <button className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10">{t("logout")}</button>
                </SignOutButton>
              </>
            ) : (
              <Link href="/login" className="btn-gold !py-2">{t("login")}</Link>
            )}
          </div>
          <button className="rounded-lg p-2 hover:bg-white/10 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
            {open ? <IconX /> : <IconMenu />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-maroon-800 lg:hidden">
          <nav className="container-page flex flex-col py-2">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={`rounded-lg px-3 py-3 text-[15px] ${path.startsWith(l.href) ? "text-gold-300" : "text-white"}`}>
                {l.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-white/10 pt-3">
              {user ? (
                <SignOutButton redirectUrl="/">
                  <button onClick={() => setOpen(false)} className="w-full rounded-lg px-3 py-3 text-left text-white/80">{t("logout")}</button>
                </SignOutButton>
              ) : (
                <Link href="/login" onClick={() => setOpen(false)} className="btn-gold w-full">{t("login")} / {t("signup")}</Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

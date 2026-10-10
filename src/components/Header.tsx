"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";
import { LangToggle } from "./LangToggle";
import { useApp } from "./providers";
import { getSupabase } from "@/lib/supabase/client";
import { IconMenu, IconX } from "./icons";

export function Header() {
  const { t, user, isAdmin } = useApp();
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/practice", label: t("nav_practice") },
    { href: "/dashboard", label: t("nav_dashboard") },
    { href: "/notebook", label: t("nav_notebook") },
    { href: "/heatmap", label: t("nav_heatmap") },
    { href: "/bookmarks", label: t("nav_bookmarks") },
    { href: "/about", label: t("nav_about") },
    ...(isAdmin ? [{ href: "/admin", label: t("nav_admin") }] : []),
  ];

  const logout = async () => {
    await getSupabase().auth.signOut();
    setOpen(false);
    window.location.assign("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gold/30 bg-maroon text-white">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Logo light />
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-white/10 ${path.startsWith(l.href) ? "text-gold-300" : "text-white/90"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LangToggle compact />
          <div className="hidden lg:block">
            {user ? (
              <button onClick={logout} className="rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10">{t("logout")}</button>
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
                <button onClick={logout} className="w-full rounded-lg px-3 py-3 text-left text-white/80">{t("logout")}</button>
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

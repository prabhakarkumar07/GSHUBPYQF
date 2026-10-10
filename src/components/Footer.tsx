"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { useApp } from "./providers";
import { IconGlobe, IconPhone, IconPin, IconWhatsApp } from "./icons";

export const CONTACT = {
  phone: "8287417384",
  phoneIntl: "918287417384",
  site: "gshubsite.com",
  whatsapp: "https://wa.me/918287417384?text=" + encodeURIComponent("Hello GS Hub, I have a query about BPSC preparation."),
};

export function Footer() {
  const { t, lang } = useApp();
  const path = usePathname();
  if (path.startsWith("/quiz/")) return null;
  return (
    <footer className="mt-16 bg-maroon-900 pb-24 text-white/85 lg:pb-0">
      <div className="h-1 bg-gradient-to-r from-gold-700 via-gold to-gold-700" />
      <div className="container-page grid gap-8 py-10 sm:grid-cols-3">
        <div>
          <Logo light className="h-12 w-auto" />
          <p className="mt-3 text-sm text-white/70">{t("footer_rights")} — BPSC &amp; UPSC coaching. {t("free_note")}</p>
        </div>
        <ul className="space-y-2.5 text-sm">
          <li><a href={`tel:+${CONTACT.phoneIntl}`} className="flex items-center gap-2 hover:text-gold-300"><IconPhone className="h-4 w-4 text-gold" /> {CONTACT.phone}</a></li>
          <li><a href={`https://${CONTACT.site}`} target="_blank" rel="noopener" className="flex items-center gap-2 hover:text-gold-300"><IconGlobe className="h-4 w-4 text-gold" /> {CONTACT.site}</a></li>
          <li className="flex items-center gap-2"><IconPin className="h-4 w-4 text-gold" /> {t("address")}</li>
          <li><a href={CONTACT.whatsapp} target="_blank" rel="noopener" className="flex items-center gap-2 hover:text-gold-300"><IconWhatsApp className="h-4 w-4 text-gold" /> {t("whatsapp")}</a></li>
        </ul>
        <ul className="grid grid-cols-2 gap-2 text-sm">
          <li><Link href="/practice" className="hover:text-gold-300">{t("nav_practice")}</Link></li>
          <li><Link href="/notebook" className="hover:text-gold-300">{t("nav_notebook")}</Link></li>
          <li><Link href="/heatmap" className="hover:text-gold-300">{t("nav_heatmap")}</Link></li>
          <li><Link href="/bookmarks" className="hover:text-gold-300">{t("nav_bookmarks")}</Link></li>
          <li><Link href="/dashboard" className="hover:text-gold-300">{t("nav_dashboard")}</Link></li>
          <li><Link href="/about" className="hover:text-gold-300">{t("nav_about")}</Link></li>
          <li><a href="https://gshubsite.com/new-courses" target="_blank" rel="noopener" className="font-semibold text-gold hover:text-gold-300">{lang === "hi" ? "पेड कोर्स ↗" : "Paid courses ↗"}</a></li>
        </ul>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">© {new Date().getFullYear()} GS Hub Civil Services Classes · Trust the Process</div>
    </footer>
  );
}

"use client";
import Link from "next/link";
import { useApp } from "@/components/providers";
import { CoursesPromo } from "@/components/CoursesPromo";
import { TestSection } from "@/components/tests/TestSection";
import { IconBookmark, IconChart, IconGrid, IconNotebook, IconPlay, IconGlobe } from "@/components/icons";

export function HomeClient({ count }: { count: number | null }) {
  const { t, lang, user } = useApp();
  const fmt = (n: number) => n.toLocaleString("en-IN");
  const features = [
    { icon: IconPlay, title: t("f_builder"), d: t("f_builder_d") },
    { icon: IconNotebook, title: t("f_notebook"), d: t("f_notebook_d") },
    { icon: IconChart, title: t("f_compare"), d: t("f_compare_d") },
    { icon: IconGrid, title: t("f_heatmap"), d: t("f_heatmap_d") },
    { icon: IconBookmark, title: t("f_bookmark"), d: t("f_bookmark_d") },
    { icon: IconGlobe, title: t("f_bilingual"), d: t("f_bilingual_d") },
  ];
  return (
    <div className={lang === "hi" ? "font-hindi" : ""}>
      {/* Hero */}
      <section className="relative overflow-hidden bg-maroon text-white">
        <div className="pattern-dots absolute inset-0 opacity-40" aria-hidden />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gold/20 blur-3xl" aria-hidden />
        <div className="container-page relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.2fr_.8fr]">
          <div>
            <span className="inline-block rounded-full border border-gold/50 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[.16em] text-gold-300">{t("hero_kicker")}</span>
            <h1 className="mt-5 font-display text-[2.1rem] font-bold leading-[1.15] sm:text-5xl">{t("hero_title")}</h1>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-white/80 sm:text-lg">{t("hero_sub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/practice" className="btn-gold px-6 py-3.5 text-base">{t("hero_cta")} →</Link>
              <Link href={user ? "/dashboard" : "#how"} className="btn border border-white/30 px-5 py-3.5 text-base text-white hover:bg-white/10">{user ? t("nav_dashboard") : t("hero_secondary")}</Link>
            </div>
            <p className="mt-4 text-sm text-white/60">{t("free_note")}</p>
          </div>
          <div className="relative">
            <div className="rounded-3xl border border-gold/40 bg-white/[.06] p-6 backdrop-blur sm:p-8">
              <div className="text-sm font-medium text-gold-300">GS Hub · BPSC</div>
              <div className="mt-2 font-display text-6xl font-bold tabular-nums text-white sm:text-7xl">{count !== null ? fmt(count) : "—"}</div>
              <div className="mt-1 text-lg text-white/85">{t("live_pyqs")}</div>
              <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
                {["56th–71st", lang === "hi" ? "8 विषय" : "8 subjects", lang === "hi" ? "हिंदी + English" : "Hindi + English"].map((x) => (
                  <div key={x} className="rounded-xl bg-white/10 px-2 py-3 font-semibold text-white/90">{x}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tests */}
      <TestSection category="pyq_full" />
      <TestSection category="monthly" tinted />

      <CoursesPromo />

      {/* Features */}
      <section className="container-page py-14">
        <h2 className="h-display text-center text-2xl sm:text-3xl">{t("features_title")}</h2>
        <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-gold" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, d }) => (
            <div key={title} className="card p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-maroon text-gold"><Icon className="h-5 w-5" /></div>
              <h3 className="mt-4 text-lg font-bold text-maroon">{title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-stone-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-gold/30 bg-gold-50/60">
        <div className="container-page py-14">
          <h2 className="h-display text-center text-2xl sm:text-3xl">{t("how_title")}</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {[t("how_1"), t("how_2"), t("how_3")].map((s, i) => (
              <li key={i} className="flex gap-4 rounded-2xl bg-white p-5 ring-1 ring-gold/30">
                <span className="font-display text-4xl font-bold text-gold">{i + 1}</span>
                <span className="pt-1.5 text-[15px] text-stone-700">{s}</span>
              </li>
            ))}
          </ol>
          <div className="mt-10 text-center">
            <Link href="/practice" className="btn-primary px-7 py-3.5 text-base">{t("hero_cta")}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

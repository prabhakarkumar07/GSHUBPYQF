"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/providers";
import { ConfigNotice, Empty, PageHeader, Spinner, heatColor } from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

interface Row { subject_id: number; topic_id: number | null; attempted: number; correct: number }

export function HeatMap() {
  const { t, user, authReady, taxonomy, pick, lang } = useApp();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (!authReady || !user || !isSupabaseConfigured) return;
    getSupabase().rpc("get_my_accuracy").then(({ data }) => setRows((data as Row[]) ?? []));
  }, [authReady, user]);

  const subjects = useMemo(() => {
    return taxonomy.subjects.map((s) => {
      const r = (rows ?? []).filter((x) => x.subject_id === s.id);
      const attempted = r.reduce((a, b) => a + b.attempted, 0);
      const correct = r.reduce((a, b) => a + b.correct, 0);
      return { s, attempted, correct, pct: attempted ? Math.round((100 * correct) / attempted) : null };
    });
  }, [rows, taxonomy.subjects]);

  const recommendation = useMemo(() => {
    const weak = subjects.filter((x) => x.pct !== null && x.pct < 70).sort((a, b) => (a.pct! - b.pct!)).slice(0, 2);
    if (!weak.length) return null;
    const names = weak.map((x) => pick(x.s.name_en, x.s.name_hi));
    return t("focus_next", { a: names.join(lang === "hi" ? " और " : " and ") });
  }, [subjects, pick, t, lang]);

  if (!isSupabaseConfigured) return <div className="container-page py-10"><ConfigNotice /></div>;
  if (!authReady || rows === null) return <Spinner label={t("loading")} />;

  const activeSubject = subjects.find((x) => x.s.id === active);
  const topicTiles = active
    ? taxonomy.topics.filter((tp) => tp.subject_id === active).map((tp) => {
        const r = rows.find((x) => x.topic_id === tp.id);
        return { tp, attempted: r?.attempted ?? 0, pct: r && r.attempted ? Math.round((100 * r.correct) / r.attempted) : null };
      })
    : [];

  return (
    <div className={`container-page py-8 ${lang === "hi" ? "font-hindi" : ""}`}>
      <PageHeader title={t("heatmap_title")} sub={t("heatmap_sub")} />
      {rows.length === 0 ? (
        <Empty text={t("heatmap_empty")} action={<Link href="/practice" className="btn-primary">{t("start_quiz")}</Link>} />
      ) : (
        <>
          {recommendation && (
            <div className="mb-5 flex items-center gap-3 rounded-2xl border-l-4 border-gold bg-white p-4 shadow-sm">
              <span className="text-2xl" aria-hidden>🎯</span>
              <p className="font-semibold text-maroon">{recommendation}</p>
            </div>
          )}
          <Legend />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {subjects.map(({ s, attempted, pct }) => (
              <button key={s.id} onClick={() => setActive(active === s.id ? null : s.id)} className={`flex min-h-[118px] flex-col justify-between rounded-2xl border p-4 text-left transition hover:scale-[1.02] ${heatColor(pct)} ${active === s.id ? "ring-4 ring-maroon/30" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold leading-snug">{pick(s.name_en, s.name_hi)}</span>
                  <span aria-hidden>{s.icon}</span>
                </div>
                <div>
                  <div className="font-display text-3xl font-bold tabular-nums">{pct !== null ? `${pct}%` : "—"}</div>
                  <div className="text-xs opacity-80">{attempted ? `${attempted} ${t("attempted")}` : t("no_attempts")}</div>
                </div>
              </button>
            ))}
          </div>

          {activeSubject && (
            <section className="card mt-6 p-5">
              <h2 className="h-display text-lg">{activeSubject.s.icon} {pick(activeSubject.s.name_en, activeSubject.s.name_hi)} — {t("by_topic")}</h2>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                {topicTiles.map(({ tp, attempted, pct }) => (
                  <div key={tp.id} className={`rounded-xl border p-3 ${heatColor(pct)}`}>
                    <div className="text-[13px] font-semibold leading-snug">{pick(tp.name_en, tp.name_hi)}</div>
                    <div className="mt-2 font-display text-2xl font-bold tabular-nums">{pct !== null ? `${pct}%` : "—"}</div>
                    <div className="text-[11px] opacity-80">{attempted ? `${attempted} ${t("attempted")}` : t("no_attempts")}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/practice?subject=${activeSubject.s.id}`} className="btn-primary">{t("start_quiz")}</Link>
                <Link href={`/notebook`} className="btn-outline">{t("go_notebook")}</Link>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Legend() {
  const { t } = useApp();
  return (
    <div className="flex flex-wrap gap-3 text-xs text-stone-600">
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-500" />{t("legend_weak")}</span>
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-300" />{t("legend_avg")}</span>
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-green-500" />{t("legend_strong")}</span>
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-stone-200" />{t("no_attempts")}</span>
    </div>
  );
}

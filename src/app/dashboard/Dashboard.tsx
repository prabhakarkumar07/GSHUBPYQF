"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/providers";
import { ConfigNotice, Empty, Spinner, Stat } from "@/components/ui";
import { LineChart } from "@/components/LineChart";
import { IconBookmark, IconGrid, IconNotebook, IconPlay } from "@/components/icons";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getActiveSession } from "@/lib/quiz-store";
import { computeStreak, formatDuration } from "@/lib/scoring";
import type { Attempt } from "@/lib/types";

export function Dashboard() {
  const { t, user, profile, authReady, lang } = useApp();
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [mistakes, setMistakes] = useState<number>(0);
  const [bookmarks, setBookmarks] = useState<number>(0);
  const [resume, setResume] = useState<{ id: string; title: string; answered: number; total: number } | null>(null);

  useEffect(() => {
    if (!authReady || !user || !isSupabaseConfigured) return;
    (async () => {
      const sb = getSupabase();
      const [{ data: a }, m, b] = await Promise.all([
        sb.from("quiz_attempts").select("*").order("started_at", { ascending: false }).limit(100),
        sb.from("mistakes").select("question_id", { count: "exact", head: true }),
        sb.from("bookmarks").select("question_id", { count: "exact", head: true }),
      ]);
      const list = (a as Attempt[]) ?? [];
      setAttempts(list);
      setMistakes(m.count ?? 0);
      setBookmarks(b.count ?? 0);
      const local = getActiveSession();
      const remote = list.find((x) => x.status === "in_progress");
      if (local) setResume({ id: local.id, title: local.title, answered: Object.values(local.responses).filter((r) => r.selected).length, total: local.questionIds.length });
      else if (remote) setResume({ id: remote.id, title: remote.title ?? "Quiz", answered: Object.values(remote.responses ?? {}).filter((r) => r.selected).length, total: remote.question_ids.length });
    })();
  }, [authReady, user]);

  if (!isSupabaseConfigured) return <div className="container-page py-10"><ConfigNotice /></div>;
  if (!authReady || attempts === null) return <Spinner label={t("loading")} />;

  const done = attempts.filter((a) => a.status === "submitted");
  const totC = done.reduce((s, a) => s + (a.correct_count ?? 0), 0);
  const totW = done.reduce((s, a) => s + (a.wrong_count ?? 0), 0);
  const overall = totC + totW ? Math.round((100 * totC) / (totC + totW)) : 0;
  const streak = computeStreak(done.map((a) => a.submitted_at ?? a.started_at));
  const trend = [...done].reverse().slice(-15).map((a) => {
    const att = (a.correct_count ?? 0) + (a.wrong_count ?? 0);
    return { x: new Date(a.submitted_at ?? a.started_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), y: att ? Math.round((100 * (a.correct_count ?? 0)) / att) : 0 };
  });
  const name = profile?.full_name || user?.email?.split("@")[0] || "";

  return (
    <div className={`container-page py-8 ${lang === "hi" ? "font-hindi" : ""}`}>
      <div className="mb-6">
        <div className="text-sm text-stone-500">{t("welcome")},</div>
        <h1 className="h-display text-2xl sm:text-3xl">{name}</h1>
      </div>

      {resume && (
        <Link href={`/quiz/${resume.id}`} className="mb-5 flex items-center gap-4 rounded-2xl border border-gold bg-gold-50 p-4 transition hover:shadow-md">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-maroon text-gold"><IconPlay /></span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-wide text-gold-700">{t("resume_quiz")}</div>
            <div className="truncate font-semibold text-maroon">{resume.title}</div>
            <div className="text-xs text-stone-600">{resume.answered} / {resume.total} {t("answered").toLowerCase()}</div>
          </div>
          <span className="font-semibold text-maroon">→</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat accent label={t("streak")} value={<span>🔥 {streak}</span>} hint={t("days")} />
        <Stat label={t("overall_accuracy")} value={`${overall}%`} />
        <Stat label={t("quizzes_taken")} value={done.length} />
        <Stat label={t("questions_solved")} value={totC + totW} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink href="/practice" icon={<IconPlay />} label={t("nav_practice")} />
        <QuickLink href="/notebook" icon={<IconNotebook />} label={t("nav_notebook")} count={mistakes} />
        <QuickLink href="/heatmap" icon={<IconGrid />} label={t("nav_heatmap")} />
        <QuickLink href="/bookmarks" icon={<IconBookmark />} label={t("nav_bookmarks")} count={bookmarks} />
      </div>

      <section className="card mt-6 p-5">
        <h2 className="mb-3 font-bold text-maroon">{t("accuracy_trend")}</h2>
        {trend.length ? <LineChart points={trend} label={t("accuracy_trend")} /> : <p className="text-sm text-stone-500">{t("no_history")}</p>}
      </section>

      <section className="mt-6">
        <h2 className="h-display mb-3 text-xl">{t("quiz_history")}</h2>
        {attempts.length === 0 ? (
          <Empty text={t("no_history")} action={<Link href="/practice" className="btn-primary">{t("start_quiz")}</Link>} />
        ) : (
          <div className="card overflow-hidden">
            <ul className="divide-y divide-maroon/5">
              {attempts.slice(0, 30).map((a) => {
                const att = (a.correct_count ?? 0) + (a.wrong_count ?? 0);
                const acc = att ? Math.round((100 * (a.correct_count ?? 0)) / att) : null;
                return (
                  <li key={a.id}>
                    <Link href={a.status === "submitted" ? `/result/${a.id}` : `/quiz/${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-maroon-50/40">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-ink">{a.title ?? "Quiz"}</div>
                        <div className="text-xs text-stone-500">
                          {new Date(a.started_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · {a.mode === "exam" ? t("exam_mode") : t("practice_mode")} · {a.total_count} Q
                          {a.time_taken_sec ? ` · ${formatDuration(a.time_taken_sec)}` : ""}
                        </div>
                      </div>
                      {a.status === "submitted" ? (
                        <div className="text-right">
                          <div className="font-display font-bold tabular-nums text-maroon">{a.score}</div>
                          <div className="text-xs tabular-nums text-stone-500">{acc !== null ? `${acc}%` : "—"}</div>
                        </div>
                      ) : (
                        <span className="badge bg-gold-100 text-gold-700">{t("in_progress")}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function QuickLink({ href, icon, label, count }: { href: string; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <Link href={href} className="card flex items-center gap-3 p-3.5 transition hover:border-maroon/30">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-maroon-50 text-maroon">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{label}</span>
      {count !== undefined && <span className="rounded-full bg-maroon px-2 py-0.5 text-xs font-bold text-white">{count}</span>}
    </Link>
  );
}

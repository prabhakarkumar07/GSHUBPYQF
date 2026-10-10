"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useApp } from "@/components/providers";
import { QuestionBody, QuestionMeta, SolutionBox } from "@/components/QuestionBody";
import { BookmarkButton } from "@/components/BookmarkButton";
import { Bar, LoginPrompt, Spinner, StrengthBadge } from "@/components/ui";
import { RichText } from "@/components/RichText";
import { fetchApi } from "@/lib/api-client";
import { useAuth } from "@clerk/nextjs";
import { formatDuration, gradeQuiz, type GradedQuestion, type ResultSummary } from "@/lib/scoring";
import type { Attempt, Question, QuestionStat, Responses } from "@/lib/types";

interface Loaded {
  title: string;
  mode: "practice" | "exam";
  summary: ResultSummary;
  timeTaken: number;
  synced: boolean;
  effects: Record<string, string | null>;
  stats: Record<string, QuestionStat>;
  positive: number;
  negative: number;
}

export function ResultView() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const { t, user, authReady, subjectName, topicName, pick, lang, taxonomy, profile, showPaywall } = useApp();
  const isFree = profile?.subscription_tier !== "premium";
  const [data, setData] = useState<Loaded | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [filter, setFilter] = useState<"all" | "wrong" | "correct" | "skipped">("all");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authReady || !taxonomy.loaded) return;
    (async () => {
      let qids: string[] = [], responses: Responses = {}, title = "Quiz", mode: "practice" | "exam" = "practice";
      let positive = taxonomy.settings.positive_marks, negative = taxonomy.settings.negative_marks, timeTaken = 0, synced = false;
      const effects: Record<string, string | null> = {};
      const stats: Record<string, QuestionStat> = {};
      let qs: Question[] = [];
      let bm: any[] = [];

      try {
        if (user) {
          const token = await getToken({ template: "supabase" });
          const data = await fetchApi(`/quiz/${id}/result`, {}, token);
          const attempt = data.attempt;
          
          qids = attempt.question_ids; responses = attempt.responses ?? {}; title = attempt.title ?? title; mode = attempt.mode;
          positive = Number(attempt.positive_marks); negative = Number(attempt.negative_marks); timeTaken = attempt.time_taken_sec ?? 0; synced = true;
          
          (data.answers ?? []).forEach((r: any) => { effects[r.question_id] = r.notebook_effect; });
          ((data.stats as QuestionStat[]) ?? []).forEach((x) => { stats[x.question_id] = x; });
          qs = data.questions || [];
          bm = data.bookmarks || [];
        } else {
          // Keep local logic for anonymous users
          const s = (await import("@/lib/quiz-store")).loadSession(id);
          if (!s || s.status !== "submitted") { setState("missing"); return; }
          qids = s.questionIds; responses = s.responses; title = s.title; mode = s.mode;
          positive = s.positiveMarks; negative = s.negativeMarks; timeTaken = s.elapsedSec;
          
          const token = null;
          // Anonymous users shouldn't have bookmarks, we just need questions and stats
          // We can use the admin endpoint or create a public one. Since we don't have it, we use Supabase directly for anonymous local quizzes.
          const sb = (await import("@/lib/supabase/client")).getSupabase();
          const [{ data: qsData }, { data: stData }] = await Promise.all([
            sb.from("questions").select("*, high_priority").in("id", qids),
            sb.rpc("get_question_stats", { p_ids: qids })
          ]);
          qs = (qsData as Question[]) || [];
          ((stData as QuestionStat[]) ?? []).forEach((x) => { stats[x.question_id] = x; });
        }

        const byId = new Map(qs.map((q) => [q.id, q]));
        const ordered = qids.map((q) => byId.get(q)).filter(Boolean) as Question[];
        
        setBookmarks(new Set(bm.map((b: any) => b.question_id)));
        setData({
          title, mode, timeTaken, synced, effects, stats, positive, negative,
          summary: gradeQuiz(ordered, responses, positive, negative, stats, taxonomy.settings.min_stats_attempts),
        });
        setState("ready");
      } catch (err) {
        console.error(err);
        setState("missing");
      }
    })();
  }, [id, authReady, user, taxonomy.loaded, taxonomy.settings, getToken]);

  const impact = useMemo(() => {
    if (!data) return { missed: [] as GradedQuestion[], tough: [] as GradedQuestion[] };
    const g = data.summary.graded.filter((x) => x.communityPct !== null);
    return {
      missed: g.filter((x) => x.outcome !== "correct" && (x.communityPct ?? 0) >= 60).sort((a, b) => (b.communityPct ?? 0) - (a.communityPct ?? 0)).slice(0, 5),
      tough: g.filter((x) => x.outcome === "correct" && (x.communityPct ?? 100) <= 35).sort((a, b) => (a.communityPct ?? 0) - (b.communityPct ?? 0)).slice(0, 5),
    };
  }, [data]);


  if (state === "loading") return <Spinner label={t("loading")} />;
  if (state === "missing" || !data) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-stone-600">{t("quiz_not_found")}</p>
        <Link href="/practice" className="btn-primary mt-5">{t("start_quiz")}</Link>
      </div>
    );
  }

  const s = data.summary;
  const effectsList = Object.values(data.effects);
  const added = effectsList.filter((e) => e === "added").length;
  const cleared = effectsList.filter((e) => e === "cleared").length;
  const shown = s.graded.filter((g) => filter === "all" || g.outcome === filter);
  const toggleOpen = (qid: string) => setOpen((o) => { const n = new Set(o); if (n.has(qid)) n.delete(qid); else n.add(qid); return n; });

  return (
    <div className={`container-page py-8 ${lang === "hi" ? "font-hindi" : ""}`}>
      {/* Score hero */}
      <section className="overflow-hidden rounded-3xl bg-maroon text-white">
        <div className="pattern-dots relative p-6 sm:p-8">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-gold-300">{t("result_title")} · {data.mode === "exam" ? t("exam_mode") : t("practice_mode")}</div>
          <h1 className="mt-1 font-display text-xl font-bold sm:text-2xl">{data.title}</h1>
          <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-4">
            <div>
              <div className="text-sm text-white/70">{t("score")}</div>
              <div className="font-display text-5xl font-bold tabular-nums sm:text-6xl">{s.score}<span className="text-2xl text-white/60"> / {s.maxScore}</span></div>
              <div className="mt-1 text-xs text-white/60">+{data.positive} / −{data.negative}</div>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
              <MiniStat label={t("correct")} value={s.correct} tone="text-green-300" />
              <MiniStat label={t("wrong")} value={s.wrong} tone="text-red-300" />
              <MiniStat label={t("skipped")} value={s.skipped} tone="text-white" />
              <MiniStat label={t("accuracy")} value={`${s.accuracy}%`} tone="text-gold-300" />
            </div>
          </div>
          <div className="mt-4 text-sm text-white/75">⏱ {t("time_taken")}: <b className="text-white">{formatDuration(data.timeTaken)}</b></div>
        </div>
      </section>

      {!data.synced && !user && <div className="mt-5"><LoginPrompt text={t("guest_result")} /></div>}
      {data.synced && (added > 0 || cleared > 0) && (
        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-maroon/10 bg-white p-4 text-sm">
          <span className="font-semibold text-maroon">{t("notebook_changes")}:</span>
          {added > 0 && <span className="badge bg-red-100 text-red-800">+{added} {t("n_added")}</span>}
          {cleared > 0 && <span className="badge bg-green-100 text-green-800">✓ {cleared} {t("n_cleared")}</span>}
          <Link href="/notebook" className="ml-auto text-sm font-semibold text-maroon hover:underline">{t("go_notebook")} →</Link>
        </div>
      )}

      {/* Impact */}
      <section className="mt-8">
        <h2 className="h-display text-xl">{t("impact_title")} {isFree && <button onClick={() => showPaywall("compare")} className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-maroon-900">🔒Premium</button>}</h2>
        {isFree ? (
          <div className="relative mt-3">
            <div className="pointer-events-none grid select-none gap-3 blur-[6px] md:grid-cols-2" aria-hidden="true">
              <ImpactCard tone="red" pct={64} text={`64% ${t("impact_missed")}`} html={lang === "hi" ? "गुप्त काल में नालंदा महाविहार की स्थापना किसने की?" : "Who founded the Nalanda Mahavihara?"} onClick={() => {}} />
              <ImpactCard tone="red" pct={52} text={`52% ${t("impact_missed")}`} html={lang === "hi" ? "किस अनुच्छेद में अस्पृश्यता का अंत है?" : "Which article abolishes untouchability?"} onClick={() => {}} />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/60 p-4 text-center">
              <div className="font-display text-lg font-bold text-maroon">{lang === "hi" ? "कौन-से प्रश्न सबने सही किए पर आपसे छूट गए?" : "Which questions did most students get right — but you missed?"}</div>
              <p className="max-w-md text-sm text-stone-600">{lang === "hi" ? "हज़ारों छात्रों से तुलना देखें और असली कमज़ोरी पकड़ें।" : "Compare with every student on the portal and find the marks you're really losing."}</p>
              <button onClick={() => showPaywall("compare")} className="btn-gold">⭐ {lang === "hi" ? "Premium से देखें" : "Unlock with Premium"}</button>
            </div>
          </div>
        ) : impact.missed.length === 0 && impact.tough.length === 0 ? (
          <p className="mt-3 rounded-xl bg-white p-4 text-sm text-stone-500 ring-1 ring-maroon/10">{t("impact_none")}</p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {impact.missed.map((g) => (
              <ImpactCard key={g.question.id} tone="red" pct={g.communityPct!} text={`${g.communityPct}% ${t("impact_missed")}`} html={pick(g.question.question_en, g.question.question_hi)} onClick={() => { setFilter("all"); setOpen((o) => new Set(o).add(g.question.id)); document.getElementById(`q-${g.question.id}`)?.scrollIntoView({ behavior: "smooth" }); }} />
            ))}
            {impact.tough.map((g) => (
              <ImpactCard key={g.question.id} tone="green" pct={g.communityPct!} text={t("impact_tough", { p: g.communityPct! })} html={pick(g.question.question_en, g.question.question_hi)} onClick={() => { setFilter("all"); setOpen((o) => new Set(o).add(g.question.id)); document.getElementById(`q-${g.question.id}`)?.scrollIntoView({ behavior: "smooth" }); }} />
            ))}
          </div>
        )}
      </section>

      {/* Breakdown */}
      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <BreakdownTable title={t("breakdown_subject")} rows={s.bySubject.map((b) => ({ key: b.id, name: subjectName(b.id), b }))} />
        <BreakdownTable title={t("breakdown_topic")} rows={s.byTopic.map((b) => ({ key: b.id, name: topicName(b.id), sub: subjectName(b.subjectId), b }))} />
      </section>

      {/* Per question */}
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="h-display text-xl">{t("per_question")} · {t("full_solutions")}</h2>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "wrong", "correct", "skipped"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={filter === f ? "chip-on !py-1" : "chip-off !py-1"}>
                {t(`filter_${f}` as const)} {f !== "all" && <span className="opacity-70">({f === "wrong" ? s.wrong : f === "correct" ? s.correct : s.skipped})</span>}
              </button>
            ))}
            <button className="btn-ghost !py-1 text-xs" onClick={() => setOpen(open.size ? new Set() : new Set(shown.map((g) => g.question.id)))}>{open.size ? t("hide_solution") : t("show_solution")}</button>
          </div>
        </div>
        <ol className="mt-4 space-y-3">
          {shown.map((g) => {
            const i = s.graded.indexOf(g);
            const isOpen = open.has(g.question.id);
            const eff = data.effects[g.question.id];
            return (
              <li key={g.question.id} id={`q-${g.question.id}`} className="card scroll-mt-40 overflow-hidden">
                <button onClick={() => toggleOpen(g.question.id)} className="flex w-full items-start gap-3 p-4 text-left">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${g.outcome === "correct" ? "bg-green-600 text-white" : g.outcome === "wrong" ? "bg-red-500 text-white" : "bg-stone-200 text-stone-600"}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <RichText html={pick(g.question.question_en, g.question.question_hi).replace(/<table[\s\S]*<\/table>/, " [table] ")} className="line-clamp-2 text-[15px] text-ink" />
                    <div className="mt-2 grid max-w-md grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1 text-xs text-stone-600">
                      <span>{t("all_users")}</span>
                      <Bar pct={g.communityPct ?? 0} className="bg-gold" />
                      <span className="tabular-nums">{g.communityPct !== null ? `${g.communityPct}%` : t("not_enough_data")}</span>
                      <span>{t("you")}</span>
                      <Bar pct={g.outcome === "correct" ? 100 : 0} className="bg-green-600" />
                      <span className={g.outcome === "correct" ? "text-green-700" : g.outcome === "wrong" ? "text-red-700" : ""}>
                        {g.outcome === "correct" ? "✓" : g.outcome === "wrong" ? `✗ (${g.selected})` : "—"}
                      </span>
                    </div>
                  </div>
                  <span className="text-stone-400">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-maroon/10 p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <QuestionMeta q={g.question} />
                      <BookmarkButton size="sm" questionId={g.question.id} bookmarked={bookmarks.has(g.question.id)} onChange={(v) => setBookmarks((b) => { const n = new Set(b); if (v) n.add(g.question.id); else n.delete(g.question.id); return n; })} />
                    </div>
                    <QuestionBody q={g.question} selected={g.selected} reveal communityCounts={data.stats[g.question.id]?.option_counts} />
                    {eff === "cleared" && <div className="mt-3 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white">{t("cleared_notebook")}</div>}
                    {eff === "added" && <div className="mt-3 rounded-xl bg-maroon-50 px-4 py-2 text-sm text-maroon">{t("added_notebook")}</div>}
                    {eff === "missed_again" && <div className="mt-3 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-900">{t("missed_again")}</div>}
                    <SolutionBox q={g.question} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/practice" className="btn-primary">{t("retake")}</Link>
        {user && <Link href="/notebook" className="btn-outline">{t("go_notebook")}</Link>}
        {user && <Link href="/heatmap" className="btn-outline">{t("nav_heatmap")}</Link>}
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-white/60">{label}</div>
      <div className={`font-display text-2xl font-bold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

function ImpactCard({ tone, pct, text, html, onClick }: { tone: "red" | "green"; pct: number; text: string; html: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex gap-3 rounded-2xl border p-4 text-left transition hover:shadow-md ${tone === "red" ? "border-red-200 bg-red-50/60" : "border-green-200 bg-green-50/60"}`}>
      <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl font-display text-lg font-bold ${tone === "red" ? "bg-red-500 text-white" : "bg-green-600 text-white"}`}>{pct}%</div>
      <div className="min-w-0">
        <div className={`text-sm font-semibold ${tone === "red" ? "text-red-800" : "text-green-800"}`}>{text}</div>
        <RichText html={html.replace(/<table[\s\S]*<\/table>/, " [table] ")} className="mt-1 line-clamp-2 text-sm text-stone-700" />
      </div>
    </button>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: { key: number; name: string; sub?: string; b: { attempted: number; correct: number; wrong: number; skipped: number; total: number } }[] }) {
  const { t } = useApp();
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-maroon/10 px-4 py-3 font-bold text-maroon">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-maroon-50/60 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr><th className="px-4 py-2">&nbsp;</th><th className="px-2 py-2 text-center">✓</th><th className="px-2 py-2 text-center">✗</th><th className="px-2 py-2 text-center">—</th><th className="px-4 py-2 text-right">{t("accuracy")}</th></tr>
          </thead>
          <tbody>
            {rows.sort((a, b) => b.b.total - a.b.total).map(({ key, name, sub, b }) => {
              const pct = b.attempted ? Math.round((100 * b.correct) / b.attempted) : null;
              return (
                <tr key={key} className="border-t border-maroon/5">
                  <td className="px-4 py-2.5"><div className="font-medium text-ink">{name}</div>{sub && <div className="text-xs text-stone-500">{sub}</div>}</td>
                  <td className="px-2 text-center tabular-nums text-green-700">{b.correct}</td>
                  <td className="px-2 text-center tabular-nums text-red-700">{b.wrong}</td>
                  <td className="px-2 text-center tabular-nums text-stone-500">{b.skipped}</td>
                  <td className="px-4 py-2.5 text-right"><div className="font-semibold tabular-nums">{pct !== null ? `${pct}%` : "—"}</div><StrengthBadge pct={pct} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

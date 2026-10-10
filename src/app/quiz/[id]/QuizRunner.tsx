"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/components/providers";
import { QuestionBody, QuestionMeta, SolutionBox } from "@/components/QuestionBody";
import { BookmarkButton } from "@/components/BookmarkButton";
import { Spinner } from "@/components/ui";
import { IconClock, IconFlag, IconGrid, IconX } from "@/components/icons";
import { fetchApi } from "@/lib/api-client";
import { useAuth } from "@clerk/nextjs";
import { loadSession, saveSession, clearActive } from "@/lib/quiz-store";
import { formatDuration } from "@/lib/scoring";
import type { Attempt, OptionKey, Question, QuizSession, ResponseEntry } from "@/lib/types";

export function QuizRunner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, user, authReady, lang } = useApp();
  const { getToken } = useAuth();

  const [session, setSession] = useState<QuizSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [loadState, setLoadState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncState, setSyncState] = useState<"idle" | "saving" | "saved">("idle");
  const [stats, setStats] = useState<Record<string, { attempts: number; correct: number }>>({});
  const [minStats, setMinStats] = useState(5);
  const sessionRef = useRef<QuizSession | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- load ----------
  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    (async () => {
      let s = loadSession(id);
      if (!s && user) {
        // resume from another device
        const token = await getToken();
        const data = await fetchApi(`/quiz/${id}`, {}, token);
        const a = data.attempt as Attempt | null;
        if (a) {
          if (a.status === "submitted") { router.replace(`/result/${id}`); return; }
          const elapsed = Math.round((Date.now() - new Date(a.started_at).getTime()) / 1000);
          s = {
            id: a.id, title: a.title ?? "Quiz", mode: a.mode, source: a.source, questionIds: a.question_ids,
            responses: a.responses ?? {}, currentIndex: a.current_index ?? 0,
            positiveMarks: Number(a.positive_marks), negativeMarks: Number(a.negative_marks), timeLimitSec: a.time_limit_sec,
            elapsedSec: a.time_limit_sec ? Math.min(elapsed, a.time_limit_sec) : 0, startedAt: a.started_at, synced: true, status: "in_progress",
          };
        }
      }
      if (!s) { if (!cancelled) setLoadState("missing"); return; }
      if (s.status === "submitted") { router.replace(`/result/${id}`); return; }

      // Fetch questions from API
      const token = user ? await getToken() : null;
      // We will assume there's a POST /api/admin/questions endpoint for fetching questions by ids
      // or we can create /api/quiz/questions
      // For now, let's keep getSupabase for questions to save time, or I'll implement it next.
      const sb = (await import("@/lib/supabase/client")).getSupabase();
      const [{ data: qs, error }, settingsRes] = await Promise.all([
        sb.from("questions").select("*, high_priority").in("id", s.questionIds),
        sb.from("app_settings").select("min_stats_attempts").eq("id", 1).maybeSingle(),
      ]);
      if (error) { setLoadState("error"); return; }
      const byId = new Map((qs as Question[]).map((q) => [q.id, q]));
      const ordered = s.questionIds.map((qid) => byId.get(qid)).filter(Boolean) as Question[];
      // drop questions that were removed/dropped after the quiz was built
      if (ordered.length !== s.questionIds.length) s = { ...s, questionIds: ordered.map((q) => q.id), currentIndex: Math.min(s.currentIndex, Math.max(0, ordered.length - 1)) };
      if (settingsRes.data) setMinStats(settingsRes.data.min_stats_attempts);

      if (user) {
        const { data: bm } = await sb.from("bookmarks").select("question_id").in("question_id", s.questionIds);
        if (!cancelled) setBookmarks(new Set((bm ?? []).map((b) => b.question_id as string)));
      }
      if (cancelled) return;
      // mark first question visited
      const first = ordered[s.currentIndex];
      if (first && !s.responses[first.id]) s = { ...s, responses: { ...s.responses, [first.id]: {} } };
      setQuestions(ordered);
      setSession(s);
      sessionRef.current = s;
      saveSession(s);
      setLoadState("ready");
    })().catch(() => !cancelled && setLoadState("error"));
    return () => { cancelled = true; };
  }, [id, authReady, user, router]);

  // ---------- persistence ----------
  const syncRemote = useCallback((s: QuizSession) => {
    if (!s.synced || !user) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    setSyncState("saving");
    syncTimer.current = setTimeout(async () => {
      const token = await getToken();
      await fetchApi("/quiz/sync", {
        method: "POST",
        body: JSON.stringify({ id: s.id, responses: s.responses, currentIndex: s.currentIndex })
      }, token).catch(console.error);
      setSyncState("saved");
    }, 800);
  }, [user]);

  const update = useCallback((fn: (s: QuizSession) => QuizSession, remote = true) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      sessionRef.current = next;
      saveSession(next);
      if (remote) syncRemote(next);
      return next;
    });
  }, [syncRemote]);

  // ---------- timer ----------
  useEffect(() => {
    if (loadState !== "ready") return;
    const h = setInterval(() => {
      update((s) => ({ ...s, elapsedSec: s.elapsedSec + 1 }), false);
    }, 1000);
    return () => clearInterval(h);
  }, [loadState, update]);

  // ---------- submit ----------
  const submit = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || submitting) return;
    setSubmitting(true);
    try {
      if (s.synced && user) {
        const token = await getToken();
        const responses: Record<string, { selected: OptionKey }> = {};
        for (const [qid, r] of Object.entries(s.responses)) if (r.selected) responses[qid] = { selected: r.selected };
        await fetchApi("/quiz/submit", {
          method: "POST",
          body: JSON.stringify({ attemptId: s.id, responses, timeTaken: s.elapsedSec })
        }, token);
      }
      const done: QuizSession = { ...s, status: "submitted", submittedAt: new Date().toISOString() };
      saveSession(done);
      clearActive(s.id);
      router.replace(`/result/${s.id}`);
    } catch (e) {
      alert((e as Error).message || t("error"));
      setSubmitting(false);
    }
  }, [router, submitting, t, user]);

  const timeLeft = session?.timeLimitSec ? session.timeLimitSec - session.elapsedSec : null;
  useEffect(() => {
    if (session?.mode === "exam" && timeLeft !== null && timeLeft <= 0 && !submitting) submit();
  }, [timeLeft, session?.mode, submit, submitting]);

  // ---------- actions ----------
  const q = session ? questions[session.currentIndex] : undefined;
  const resp: ResponseEntry = (q && session?.responses[q.id]) || {};

  const goTo = (i: number) => update((s) => {
    const target = questions[i];
    const responses = target && !s.responses[target.id] ? { ...s.responses, [target.id]: {} } : s.responses;
    return { ...s, currentIndex: i, responses };
  });

  const choose = async (key: OptionKey) => {
    if (!session || !q) return;
    if (session.mode === "exam") {
      update((s) => ({ ...s, responses: { ...s.responses, [q.id]: { ...s.responses[q.id], selected: key } } }));
      return;
    }
    if (resp.locked) return;
    update((s) => ({ ...s, responses: { ...s.responses, [q.id]: { ...s.responses[q.id], selected: key, locked: true } } }), false);
    
    if (session.synced && user) {
      const token = await getToken();
      const data = await fetchApi("/quiz/record-practice", {
        method: "POST",
        body: JSON.stringify({ attemptId: session.id, questionId: q.id, selected: key })
      }, token);
      if (data) update((s) => ({ ...s, responses: { ...s.responses, [q.id]: { ...s.responses[q.id], effect: data.effect ?? null } } }), false);
    }
    
    const token = user ? await getToken() : null;
    const { stats: st } = await fetchApi("/quiz/stats", {
      method: "POST",
      body: JSON.stringify({ ids: [q.id] })
    }, token);
    
    if (st?.[0]) setStats((m) => ({ ...m, [q.id]: { attempts: st[0].attempts, correct: st[0].correct } }));
  };

  const toggleReview = () => q && update((s) => ({ ...s, responses: { ...s.responses, [q.id]: { ...s.responses[q.id], review: !s.responses[q.id]?.review } } }));
  const clearResp = () => q && update((s) => ({ ...s, responses: { ...s.responses, [q.id]: { review: s.responses[q.id]?.review } } }));

  const counts = useMemo(() => {
    const c = { answered: 0, notAnswered: 0, marked: 0, notVisited: 0 };
    if (!session) return c;
    for (const qq of questions) {
      const r = session.responses[qq.id];
      if (!r) c.notVisited++;
      else if (r.review) c.marked++;
      else if (r.selected) c.answered++;
      else c.notAnswered++;
    }
    return c;
  }, [session, questions]);

  // ---------- render ----------
  if (loadState === "loading") return <Spinner label={t("loading")} />;
  if (loadState === "missing" || loadState === "error" || !session || !q) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-stone-600">{loadState === "error" ? t("error") : t("quiz_not_found")}</p>
        <Link href="/practice" className="btn-primary mt-5">{t("start_quiz")}</Link>
      </div>
    );
  }

  const isExam = session.mode === "exam";
  const idx = session.currentIndex;
  const last = idx === questions.length - 1;
  const revealed = !isExam && !!resp.locked;
  const st = stats[q.id];
  const statPct = st && st.attempts >= Math.max(1, minStats) ? Math.round((100 * st.correct) / st.attempts) : null;

  const Palette = (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2 text-[11px] text-stone-600">
        <Legend cls="bg-green-600 text-white" n={counts.answered} label={t("answered")} />
        <Legend cls="bg-red-100 text-red-800 ring-1 ring-red-300" n={counts.notAnswered} label={t("not_answered")} />
        <Legend cls="bg-gold text-maroon-900" n={counts.marked} label={t("marked")} />
        <Legend cls="bg-white text-stone-600 ring-1 ring-stone-300" n={counts.notVisited} label={t("not_visited")} />
      </div>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-7 lg:grid-cols-6">
        {questions.map((qq, i) => {
          const r = session.responses[qq.id];
          let cls = "bg-white text-stone-600 ring-1 ring-stone-300";
          if (r?.review) cls = "bg-gold text-maroon-900";
          else if (r?.selected && !isExam && r.locked) cls = r.selected === qq.correct_option ? "bg-green-600 text-white" : "bg-red-500 text-white";
          else if (r?.selected) cls = "bg-green-600 text-white";
          else if (r) cls = "bg-red-100 text-red-800 ring-1 ring-red-300";
          return (
            <button key={qq.id} onClick={() => { goTo(i); setPaletteOpen(false); }} className={`relative h-9 rounded-lg text-sm font-semibold tabular-nums ${cls} ${i === idx ? "outline outline-2 outline-offset-2 outline-maroon" : ""}`}>
              {i + 1}
              {r?.review && r.selected && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-green-600 ring-2 ring-white" />}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-cream pb-28 lg:pb-10 ${lang === "hi" ? "font-hindi" : ""}`}>
      {/* top bar */}
      <div className="sticky top-16 z-30 border-b border-maroon/10 bg-white/95 backdrop-blur">
        <div className="container-page flex h-14 items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-maroon">{session.title}</div>
            <div className="text-xs text-stone-500">
              {isExam ? t("exam_mode") : t("practice_mode")} · {t("question")} {idx + 1} {t("of")} {questions.length}
              {session.synced && syncState !== "idle" && <span className="ml-2 text-stone-400">· {syncState === "saving" ? t("saving") : t("saved")}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-sm font-semibold tabular-nums ${isExam && timeLeft !== null && timeLeft < 60 ? "bg-red-100 text-red-700" : "bg-maroon-50 text-maroon"}`} aria-label={isExam ? t("time_left") : t("time_taken")}>
              <IconClock className="h-4 w-4" />
              {isExam && timeLeft !== null ? formatDuration(timeLeft) : formatDuration(session.elapsedSec)}
            </div>
            <button className="btn-outline !px-2.5 !py-1.5 lg:hidden" onClick={() => setPaletteOpen(true)} aria-label={t("palette")}><IconGrid className="h-4 w-4" /></button>
            <button className="btn-primary !py-1.5" onClick={() => setConfirmOpen(true)} disabled={submitting}>{isExam ? t("submit") : t("finish_practice").split(" ")[0]}</button>
          </div>
        </div>
        <div className="h-1 bg-maroon-50"><div className="h-full bg-gold transition-all" style={{ width: `${(100 * (counts.answered + counts.marked)) / questions.length}%` }} /></div>
      </div>

      <div className="container-page grid gap-5 pt-5 lg:grid-cols-[1fr_280px]">
        <div className="card p-4 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="font-display text-lg font-bold text-maroon">{t("question")} {idx + 1}</div>
              <QuestionMeta q={q} />
            </div>
            <BookmarkButton questionId={q.id} bookmarked={bookmarks.has(q.id)} onChange={(v) => setBookmarks((b) => { const n = new Set(b); if (v) n.add(q.id); else n.delete(q.id); return n; })} />
          </div>

          <QuestionBody q={q} selected={resp.selected} reveal={revealed} onSelect={revealed ? undefined : choose} />

          {revealed && (
            <div className="mt-4 space-y-2">
              <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${resp.selected === q.correct_option ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                {resp.selected === q.correct_option ? `✓ ${t("correct")}` : `✗ ${t("incorrect")} — ${t("correct_answer")}: ${q.correct_option}`}
                {statPct !== null && <span className="ml-2 font-normal text-stone-600">· {statPct}% {t("solved_by")}</span>}
              </div>
              {resp.effect === "cleared" && <div className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white">{t("cleared_notebook")}</div>}
              {resp.effect === "added" && <div className="rounded-xl bg-maroon-50 px-4 py-2.5 text-sm text-maroon">{t("added_notebook")}</div>}
              {resp.effect === "missed_again" && <div className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900">{t("missed_again")}</div>}
              <SolutionBox q={q} />
            </div>
          )}

          {/* desktop actions */}
          <div className="mt-6 hidden flex-wrap items-center justify-between gap-2 lg:flex">
            <div className="flex gap-2">
              <button className="btn-outline" onClick={() => goTo(idx - 1)} disabled={idx === 0}>← {t("prev")}</button>
              {isExam && <button className={`btn ${resp.review ? "bg-gold text-maroon-900" : "border border-gold/60 bg-white text-gold-700"}`} onClick={toggleReview}><IconFlag className="h-4 w-4" />{resp.review ? t("unmark_review") : t("mark_review")}</button>}
              {isExam && resp.selected && <button className="btn-ghost" onClick={clearResp}>{t("clear_response")}</button>}
            </div>
            {last
              ? <button className="btn-gold px-6" onClick={() => setConfirmOpen(true)}>{isExam ? t("submit") : t("finish_practice")}</button>
              : <button className="btn-primary px-6" onClick={() => goTo(idx + 1)}>{isExam ? t("save_next") : t("next")} →</button>}
          </div>
        </div>

        <aside className="card hidden h-fit p-4 lg:sticky lg:top-40 lg:block">
          <div className="mb-3 text-sm font-bold text-maroon">{t("palette")}</div>
          {Palette}
        </aside>
      </div>

      {/* mobile action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-maroon/10 bg-white p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="flex items-center gap-2">
          <button className="btn-outline !px-3" onClick={() => goTo(idx - 1)} disabled={idx === 0} aria-label={t("prev")}>←</button>
          {isExam && <button className={`btn !px-3 ${resp.review ? "bg-gold text-maroon-900" : "border border-gold/60 bg-white text-gold-700"}`} onClick={toggleReview} aria-label={t("mark_review")}><IconFlag className="h-4 w-4" /></button>}
          {isExam && resp.selected && <button className="btn-ghost !px-2 text-xs" onClick={clearResp}>{t("clear_response")}</button>}
          <div className="flex-1" />
          {last
            ? <button className="btn-gold" onClick={() => setConfirmOpen(true)}>{isExam ? t("submit") : t("finish_practice")}</button>
            : <button className="btn-primary" onClick={() => goTo(idx + 1)}>{isExam ? t("save_next") : t("next")} →</button>}
        </div>
      </div>

      {/* palette drawer (mobile) */}
      {paletteOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setPaletteOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-bold text-maroon">{t("palette")}</span>
              <button onClick={() => setPaletteOpen(false)} aria-label={t("cancel")}><IconX /></button>
            </div>
            {Palette}
          </div>
        </div>
      )}

      {/* submit confirm */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={() => setConfirmOpen(false)}>
          <div className="w-full max-w-sm rounded-t-3xl bg-white p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
            <h2 className="h-display text-xl">{t("submit_confirm")}</h2>
            <p className="mt-1 text-sm text-stone-600">{t("submit_confirm_d")}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-green-50 p-2"><div className="text-lg font-bold text-green-700">{counts.answered + questions.filter((qq) => session.responses[qq.id]?.review && session.responses[qq.id]?.selected).length}</div>{t("answered")}</div>
              <div className="rounded-xl bg-gold-50 p-2"><div className="text-lg font-bold text-gold-700">{counts.marked}</div>{t("marked")}</div>
              <div className="rounded-xl bg-stone-50 p-2"><div className="text-lg font-bold text-stone-600">{questions.filter((qq) => !session.responses[qq.id]?.selected).length}</div>{t("skipped")}</div>
            </div>
            <div className="mt-5 flex gap-2">
              <button className="btn-outline flex-1" onClick={() => setConfirmOpen(false)}>{t("cancel")}</button>
              <button className="btn-primary flex-1" onClick={submit} disabled={submitting}>{submitting ? t("loading") : t("submit")}</button>
            </div>
          </div>
        </div>
      )}
      {submitting && timeLeft !== null && timeLeft <= 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-maroon/80 text-lg font-semibold text-white">{t("time_up")}</div>
      )}
    </div>
  );
}

function Legend({ cls, n, label }: { cls: string; n: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold ${cls}`}>{n}</span>
      <span className="leading-tight">{label}</span>
    </div>
  );
}

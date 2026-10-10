"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/components/providers";
import { ConfigNotice, LoginPrompt, PageHeader, Spinner } from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { QuizMode, QuizSource } from "@/lib/types";
import { fetchApi } from "@/lib/api-client";
import { useAuth } from "@clerk/nextjs";
import { fetchQuizIds, startQuiz } from "./startQuiz";
import { IconCheck } from "@/components/icons";

const COUNTS = [10, 20, 30];

export function QuizBuilder() {
  const { t, pick, taxonomy, user, profile, authReady, lang, showPaywall } = useApp();
  const isFree = profile?.subscription_tier !== "premium";
  const router = useRouter();
  const params = useSearchParams();
  const { getToken } = useAuth();

  const [step, setStep] = useState(0);
  const [source, setSource] = useState<QuizSource>((params.get("source") as QuizSource) || "all");
  const [subjectIds, setSubjectIds] = useState<number[]>(() => (params.get("subject") ? params.get("subject")!.split(",").map(Number) : []));
  const [topicIds, setTopicIds] = useState<number[]>(() => (params.get("topic") ? params.get("topic")!.split(",").map(Number) : []));
  const [examIds, setExamIds] = useState<number[]>([]);
  const [count, setCount] = useState<number>(20);
  const [custom, setCustom] = useState<string>("");
  const [mode, setMode] = useState<QuizMode>("practice");
  const [hpOnly, setHpOnly] = useState(params.get("hp") === "1");
  const [available, setAvailable] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjects = taxonomy.subjects;
  const topicsForSubjects = useMemo(
    () => taxonomy.topics.filter((tp) => subjectIds.length === 0 || subjectIds.includes(tp.subject_id)),
    [taxonomy.topics, subjectIds],
  );

  // keep topics consistent with chosen subjects
  useEffect(() => {
    if (!taxonomy.loaded) return;
    setTopicIds((prev) => prev.filter((id) => topicsForSubjects.some((tp) => tp.id === id)));
  }, [topicsForSubjects, taxonomy.loaded]);

  // live count of matching questions
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    const run = async () => {
      try {
        const clerkToken = user ? await getToken({ template: "supabase" }) : null;
        if (source === "all" && !hpOnly) {
          const data = await fetchApi("/quiz/count", {
            method: "POST",
            body: JSON.stringify({
              subjectIds: subjectIds.length ? subjectIds : null,
              topicIds: topicIds.length ? topicIds : null,
              examIds: examIds.length ? examIds : null,
            })
          }, clerkToken);
          if (!cancelled) setAvailable(data.count);
        } else {
          if (source !== "all" && !user) { setAvailable(0); return; }
          const ids = await fetchQuizIds({ subjectIds, topicIds, examIds, count: 150, source, highPriorityOnly: hpOnly }, clerkToken);
          if (!cancelled) setAvailable(ids.length);
        }
      } catch { if (!cancelled) setAvailable(null); }
    };
    const h = setTimeout(run, 250);
    return () => { cancelled = true; clearTimeout(h); };
  }, [subjectIds, topicIds, examIds, source, hpOnly, user]);

  const finalCount = count === -1 ? Math.min(150, Math.max(1, parseInt(custom || "0", 10) || 0)) : count;

  const toggle = (arr: number[], id: number, set: (v: number[]) => void) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const start = async () => {
    if (isFree) {
      if (finalCount > 20) { showPaywall("limit"); return; }
      if (mode === "exam") { showPaywall("exam"); return; }
    }
    if (!user) {
      router.push("/login?redirect_url=/practice");
      return;
    }
    
    setStarting(true); setError(null);
    try {
      const clerkToken = await getToken({ template: "supabase" });
      const ids = await fetchQuizIds({ subjectIds, topicIds, examIds, count: finalCount, source, highPriorityOnly: hpOnly }, clerkToken);
      if (ids.length === 0) { setError(t("no_questions")); setStarting(false); return; }
      const subjNames = subjectIds.length ? subjectIds.map((id) => subjects.find((s) => s.id === id)?.name_en).filter(Boolean).join(", ") : "All subjects";
      const prefix = source === "mistakes" ? "Mistakes Â· " : source === "bookmarks" ? "Bookmarks Â· " : "";
      const id = await startQuiz({
        questionIds: ids, mode, source,
        title: `${prefix}${subjNames}`.slice(0, 120),
        config: { subjectIds, topicIds, examIds, requested: finalCount, hpOnly },
        user, clerkToken, settings: taxonomy.settings,
      });
      router.push(`/quiz/${id}`);
    } catch (e) {
      setError((e as Error).message || t("error"));
      setStarting(false);
    }
  };

  if (!taxonomy.loaded && isSupabaseConfigured) return <Spinner label={t("loading")} />;

  const steps = [t("step_subjects"), t("step_topics"), t("step_years"), t("step_count"), t("step_mode")];
  const s = taxonomy.settings;

  return (
    <div className={`container-page py-8 ${lang === "hi" ? "font-hindi" : ""}`}>
      <ConfigNotice />
      <PageHeader title={t("builder_title")} />
      {authReady && !user && <div className="mb-5"><LoginPrompt text={t("login_to_save")} /></div>}

      {/* progress */}
      <ol className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
        {steps.map((label, i) => (
          <li key={label} className="shrink-0">
            <button onClick={() => setStep(i)} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${i === step ? "bg-maroon text-white" : i < step ? "bg-gold-100 text-maroon" : "bg-white text-stone-500 ring-1 ring-maroon/10"}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${i === step ? "bg-gold text-maroon-900" : i < step ? "bg-maroon text-white" : "bg-stone-100"}`}>{i < step ? <IconCheck className="h-3 w-3" /> : i + 1}</span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="card p-5 sm:p-6">
          <div className="mb-4 text-xs font-bold uppercase tracking-wider text-gold-700">{t("step")} {step + 1} / 5</div>
          <h2 className="mb-4 text-xl font-bold text-maroon">{steps[step]}</h2>

          {step === 0 && (
            <div className="space-y-5">
              {user && (
                <div>
                  <div className="label">{t("quiz_from")}</div>
                  <div className="flex flex-wrap gap-2">
                    {(["all", "mistakes", "bookmarks"] as const).map((src) => (
                      <button key={src} onClick={() => setSource(src)} className={source === src ? "chip-on" : "chip-off"}>{t(`source_${src}` as const)}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-500">{subjectIds.length || t("select_all")}</span>
                <div className="flex gap-2">
                  <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setSubjectIds(subjects.map((x) => x.id))}>{t("select_all")}</button>
                  <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setSubjectIds([])}>{t("clear")}</button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {subjects.map((sub) => {
                  const on = subjectIds.includes(sub.id);
                  return (
                    <button key={sub.id} onClick={() => toggle(subjectIds, sub.id, setSubjectIds)} className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${on ? "border-maroon bg-maroon-50 ring-2 ring-maroon/10" : "border-maroon/10 bg-white hover:border-maroon/30"}`}>
                      <span className="text-2xl" aria-hidden>{sub.icon}</span>
                      <span className="flex-1 font-semibold text-ink">{pick(sub.name_en, sub.name_hi)}</span>
                      <span className={`flex h-5 w-5 items-center justify-center rounded border ${on ? "border-maroon bg-maroon text-white" : "border-stone-300"}`}>{on && <IconCheck className="h-3.5 w-3.5" />}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-stone-500">{subjectIds.length === 0 ? (lang === "hi" ? "à¤•à¥‹à¤ˆ à¤µà¤¿à¤·à¤¯ à¤¨ à¤šà¥à¤¨à¥‡à¤‚ à¤¤à¥‹ à¤¸à¤­à¥€ à¤µà¤¿à¤·à¤¯à¥‹à¤‚ à¤¸à¥‡ à¤ªà¥à¤°à¤¶à¥à¤¨ à¤†à¤à¤à¤—à¥‡à¥¤" : "Leave empty to include all subjects.") : ""}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button className="btn-outline !py-1.5 text-xs" onClick={() => setTopicIds(topicsForSubjects.map((x) => x.id))}>{t("select_all")}</button>
                <button className="btn-ghost !py-1.5 text-xs" onClick={() => setTopicIds([])}>{t("clear")}</button>
              </div>
              {(subjectIds.length ? subjects.filter((x) => subjectIds.includes(x.id)) : subjects).map((sub) => {
                const tps = taxonomy.topics.filter((tp) => tp.subject_id === sub.id);
                if (!tps.length) return null;
                const allOn = tps.every((tp) => topicIds.includes(tp.id));
                return (
                  <div key={sub.id}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-maroon">{sub.icon} {pick(sub.name_en, sub.name_hi)}</span>
                      <button className="text-xs font-medium text-maroon hover:underline" onClick={() => setTopicIds(allOn ? topicIds.filter((id) => !tps.some((tp) => tp.id === id)) : [...new Set([...topicIds, ...tps.map((tp) => tp.id)])])}>
                        {allOn ? t("clear") : t("select_all")}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tps.map((tp) => (
                        <button key={tp.id} onClick={() => toggle(topicIds, tp.id, setTopicIds)} className={topicIds.includes(tp.id) ? "chip-on" : "chip-off"}>{pick(tp.name_en, tp.name_hi)}</button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-stone-500">{lang === "hi" ? "à¤•à¥‹à¤ˆ à¤Ÿà¥‰à¤ªà¤¿à¤• à¤¨ à¤šà¥à¤¨à¥‡à¤‚ à¤¤à¥‹ à¤šà¥à¤¨à¥‡ à¤—à¤ à¤µà¤¿à¤·à¤¯à¥‹à¤‚ à¤•à¥‡ à¤¸à¤­à¥€ à¤Ÿà¥‰à¤ªà¤¿à¤• à¤¶à¤¾à¤®à¤¿à¤² à¤¹à¥‹à¤‚à¤—à¥‡à¥¤" : "Leave empty to include every topic of the chosen subjects."}</p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setExamIds([])} className={examIds.length === 0 ? "chip-on" : "chip-off"}>{t("all_years")}</button>
                {taxonomy.exams.filter((ex) => ex.is_active).map((ex) => {
                  const isLocked = ex.is_premium && (!user || profile?.subscription_tier !== "premium");
                  return (
                    <button key={ex.id} onClick={() => {
                        if (isLocked) {
                          showPaywall("years");
                          return;
                        }
                        toggle(examIds, ex.id, setExamIds);
                      }} className={isLocked ? "chip border-gold/60 bg-gold-50 text-gold-700" : examIds.includes(ex.id) ? "chip-on" : "chip-off"}>
                      {isLocked && <span className="mr-1">🔒</span>}
                      {ex.short_name}{ex.year ? <span className="opacity-70"> Â· {ex.year}</span> : null}
                    </button>
                  );
                })}
              </div>
              <label className="flex items-center gap-2.5 rounded-xl bg-gold-50 p-3 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-maroon" checked={hpOnly} onChange={(e) => setHpOnly(e.target.checked)} />
                <span>â˜… {t("only_high_priority")}</span>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {COUNTS.map((c) => (
                  <button key={c} onClick={() => setCount(c)} className={`rounded-xl border py-4 text-center font-display text-2xl font-bold transition ${count === c ? "border-maroon bg-maroon text-white" : "border-maroon/15 bg-white text-maroon hover:border-maroon/40"}`}>{c}</button>
                ))}
                <button onClick={() => setCount(-1)} className={`rounded-xl border py-4 text-center font-semibold transition ${count === -1 ? "border-maroon bg-maroon text-white" : "border-maroon/15 bg-white text-maroon hover:border-maroon/40"}`}>{t("custom")}</button>
              </div>
              {count === -1 && (
                <div className="max-w-xs">
                  <label className="label" htmlFor="custom">{t("max_150")}</label>
                  <input id="custom" type="number" min={1} max={150} inputMode="numeric" className="input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="50" />
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {(["practice", "exam"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`rounded-2xl border p-5 text-left transition ${mode === m ? "border-maroon bg-maroon-50 ring-2 ring-maroon/15" : "border-maroon/10 bg-white hover:border-maroon/30"}`}>
                  <div className="text-lg font-bold text-maroon">{m === "practice" ? t("practice_mode") : t("exam_mode")}</div>
                  <p className="mt-1.5 text-sm text-stone-600">
                    {m === "practice" ? t("practice_mode_d") : `${t("exam_mode_d")} +${s.positive_marks} / âˆ’${s.negative_marks}.`}
                  </p>
                  {m === "exam" && (
                    <p className="mt-2 text-xs font-medium text-gold-700">
                      â± {Math.ceil((Math.min(finalCount, available ?? finalCount) * s.seconds_per_question) / 60)} {t("minutes")}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="mt-7 flex justify-between gap-3">
            <button className="btn-outline" onClick={() => setStep((x) => Math.max(0, x - 1))} disabled={step === 0}>â† {t("back")}</button>
            {step < 4 ? (
              <button className="btn-primary" onClick={() => setStep((x) => x + 1)}>{t("next")} â†’</button>
            ) : (
              <button className="btn-gold px-6" onClick={start} disabled={starting || available === 0 || finalCount < 1 || !isSupabaseConfigured}>{starting ? t("loading") : t("start_quiz")}</button>
            )}
          </div>
          {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        </div>

        {/* Summary */}
        <aside className="card h-fit p-5 lg:sticky lg:top-24">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500">{t("matching_questions")}</div>
          <div className="mt-1 font-display text-4xl font-bold text-maroon tabular-nums">{available ?? "â€”"}</div>
          <dl className="mt-4 space-y-2 text-sm">
            <Row k={t("step_subjects")} v={subjectIds.length ? subjectIds.map((id) => { const x = subjects.find((s2) => s2.id === id); return x ? pick(x.name_en, x.name_hi) : ""; }).join(", ") : t("all_subjects")} />
            <Row k={t("step_topics")} v={topicIds.length ? `${topicIds.length}` : t("all_topics")} />
            <Row k={t("step_years")} v={examIds.length ? taxonomy.exams.filter((e) => examIds.includes(e.id)).map((e) => e.short_name).join(", ") : t("all_years")} />
            <Row k={t("step_count")} v={String(available !== null ? Math.min(finalCount, available) : finalCount)} />
            <Row k={t("step_mode")} v={mode === "practice" ? t("practice_mode") : t("exam_mode")} />
            {source !== "all" && <Row k={t("quiz_from")} v={t(`source_${source}` as const)} />}
          </dl>
          <button className="btn-gold mt-5 w-full" onClick={start} disabled={starting || available === 0 || finalCount < 1 || !isSupabaseConfigured}>{starting ? t("loading") : t("start_quiz")}</button>
          {available === 0 && <p className="mt-2 text-xs text-red-700">{t("no_questions")}</p>}
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed border-maroon/10 pb-2">
      <dt className="text-stone-500">{k}</dt>
      <dd className="text-right font-medium text-ink">{v}</dd>
    </div>
  );
}



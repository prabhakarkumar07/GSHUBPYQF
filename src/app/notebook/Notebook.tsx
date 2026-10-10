"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/components/providers";
import { ConfigNotice, Empty, PageHeader, Spinner, Stat } from "@/components/ui";
import { QuestionBody, QuestionMeta, SolutionBox } from "@/components/QuestionBody";
import { BookmarkButton } from "@/components/BookmarkButton";
import { RichText } from "@/components/RichText";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { OptionKey, Question, QuizMode } from "@/lib/types";
import { fetchQuizIds, startQuiz } from "../practice/startQuiz";
import { IconTrash } from "@/components/icons";

interface MistakeRow { question_id: string; last_selected: OptionKey | null; times_missed: number; last_missed_at: string; question?: Question }

export function Notebook() {
  const { t, user, authReady, subjectName, topicName, pick, taxonomy, lang } = useApp();
  const router = useRouter();
  const [rows, setRows] = useState<MistakeRow[] | null>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState<number | null>(null);
  const [topic, setTopic] = useState<number | null>(null);
  const [hpOnly, setHpOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!authReady || !user || !isSupabaseConfigured) return;
    (async () => {
      const sb = getSupabase();
      const { data: m } = await sb.from("mistakes").select("question_id, last_selected, times_missed, last_missed_at").order("last_missed_at", { ascending: false });
      const list = (m as MistakeRow[]) ?? [];
      const ids = list.map((r) => r.question_id);
      if (ids.length) {
        const [{ data: qs }, { data: bm }] = await Promise.all([
          sb.from("questions").select("*, high_priority").in("id", ids),
          sb.from("bookmarks").select("question_id").in("question_id", ids),
        ]);
        const byId = new Map(((qs as Question[]) ?? []).map((q) => [q.id, q]));
        list.forEach((r) => { r.question = byId.get(r.question_id); });
        setBookmarks(new Set((bm ?? []).map((b) => b.question_id as string)));
      }
      setRows(list.filter((r) => r.question));
    })();
  }, [authReady, user]);

  const summary = useMemo(() => {
    const bySubject = new Map<number, number>(), byTopic = new Map<number, number>();
    let hp = 0;
    (rows ?? []).forEach((r) => {
      const q = r.question!;
      bySubject.set(q.subject_id, (bySubject.get(q.subject_id) ?? 0) + 1);
      if (q.topic_id) byTopic.set(q.topic_id, (byTopic.get(q.topic_id) ?? 0) + 1);
      if (q.high_priority) hp++;
    });
    return { bySubject, byTopic, hp };
  }, [rows]);

  const filtered = (rows ?? []).filter((r) =>
    (!subject || r.question!.subject_id === subject) && (!topic || r.question!.topic_id === topic) && (!hpOnly || r.question!.high_priority));

  const smartQuiz = async (mode: QuizMode) => {
    setStarting(true);
    try {
      const ids = await fetchQuizIds({ subjectIds: subject ? [subject] : [], topicIds: topic ? [topic] : [], count: 150, source: "mistakes", highPriorityOnly: hpOnly });
      if (!ids.length) { setStarting(false); return; }
      const label = topic ? topicName(topic) : subject ? subjectName(subject) : "All";
      const id = await startQuiz({ questionIds: ids, mode, source: "mistakes", title: `Mistakes · ${label}`, config: { subject, topic, hpOnly }, user, settings: taxonomy.settings });
      router.push(`/quiz/${id}`);
    } catch { setStarting(false); }
  };

  const remove = async (qid: string) => {
    if (!user) return;
    await getSupabase().from("mistakes").delete().eq("user_id", user.id).eq("question_id", qid);
    setRows((r) => (r ?? []).filter((x) => x.question_id !== qid));
  };

  if (!isSupabaseConfigured) return <div className="container-page py-10"><ConfigNotice /></div>;
  if (!authReady || rows === null) return <Spinner label={t("loading")} />;

  const topicsInSubject = [...summary.byTopic.entries()].filter(([tid]) => !subject || taxonomy.topics.find((x) => x.id === tid)?.subject_id === subject);

  return (
    <div className={`container-page py-8 ${lang === "hi" ? "font-hindi" : ""}`}>
      <PageHeader title={t("notebook_title")} sub={t("notebook_sub")} />
      {rows.length === 0 ? (
        <Empty text={t("empty_notebook")} action={<Link href="/practice" className="btn-primary">{t("start_quiz")}</Link>} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat accent label={t("total_mistakes")} value={rows.length} />
            <Stat label={t("high_priority")} value={summary.hp} />
            <Stat label={t("by_subject")} value={summary.bySubject.size} />
            <Stat label={t("by_topic")} value={summary.byTopic.size} />
          </div>

          {/* Filters */}
          <div className="card mt-5 space-y-4 p-4 sm:p-5">
            <div>
              <div className="label">{t("by_subject")}</div>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                <button className={!subject ? "chip-on shrink-0" : "chip-off shrink-0"} onClick={() => { setSubject(null); setTopic(null); }}>{t("all_subjects")} <b>{rows.length}</b></button>
                {[...summary.bySubject.entries()].sort((a, b) => b[1] - a[1]).map(([sid, n]) => (
                  <button key={sid} className={subject === sid ? "chip-on shrink-0" : "chip-off shrink-0"} onClick={() => { setSubject(sid); setTopic(null); }}>{subjectName(sid)} <b>{n}</b></button>
                ))}
              </div>
            </div>
            {topicsInSubject.length > 0 && (
              <div>
                <div className="label">{t("by_topic")}</div>
                <div className="flex flex-wrap gap-2">
                  <button className={!topic ? "chip-on !py-1" : "chip-off !py-1"} onClick={() => setTopic(null)}>{t("all_topics")}</button>
                  {topicsInSubject.sort((a, b) => b[1] - a[1]).map(([tid, n]) => (
                    <button key={tid} className={topic === tid ? "chip-on !py-1" : "chip-off !py-1"} onClick={() => setTopic(tid)}>{topicName(tid)} <b>{n}</b></button>
                  ))}
                </div>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-maroon" checked={hpOnly} onChange={(e) => setHpOnly(e.target.checked)} /> ★ {t("only_high_priority")}</label>
          </div>

          {/* Smart quiz */}
          <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-maroon p-5 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-display text-lg font-bold">{t("smart_quiz")}</div>
              <div className="text-sm text-white/75">{t("smart_quiz_d")} ({filtered.length} {t("questions")})</div>
            </div>
            <div className="flex gap-2">
              <button className="btn-gold" disabled={starting || !filtered.length} onClick={() => smartQuiz("practice")}>{t("practice_mode")}</button>
              <button className="btn border border-white/30 text-white hover:bg-white/10" disabled={starting || !filtered.length} onClick={() => smartQuiz("exam")}>{t("exam_mode")}</button>
            </div>
          </div>

          {/* List */}
          <ul className="mt-5 space-y-3">
            {filtered.map((r) => {
              const q = r.question!;
              const isOpen = open === r.question_id;
              return (
                <li key={r.question_id} className="card overflow-hidden">
                  <button className="flex w-full items-start gap-3 p-4 text-left" onClick={() => setOpen(isOpen ? null : r.question_id)}>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        <span className="badge bg-red-100 text-red-800">{t("missed_times", { n: r.times_missed })}</span>
                        {q.high_priority && <span className="badge bg-gold text-maroon-900">★ {t("high_priority")}</span>}
                        <span className="badge bg-maroon-50 text-maroon">{subjectName(q.subject_id)}</span>
                        {q.topic_id && <span className="badge bg-stone-100 text-stone-600">{topicName(q.topic_id)}</span>}
                      </div>
                      <RichText html={pick(q.question_en, q.question_hi).replace(/<table[\s\S]*<\/table>/, " [table] ")} className="line-clamp-2 text-[15px]" />
                      <div className="mt-1.5 text-xs text-stone-500">{t("last_missed")}: {new Date(r.last_missed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {t("your_answer")}: <b className="text-red-700">{r.last_selected ?? "—"}</b> · {t("correct_answer")}: <b className="text-green-700">{q.correct_option}</b></div>
                    </div>
                    <span className="shrink-0 rounded-lg bg-maroon-50 px-2.5 py-1 text-xs font-semibold text-maroon">{isOpen ? "−" : t("revise")}</span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-maroon/10 p-4">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <QuestionMeta q={q} />
                        <div className="flex gap-1.5">
                          <BookmarkButton size="sm" questionId={q.id} bookmarked={bookmarks.has(q.id)} onChange={(v) => setBookmarks((b) => { const n = new Set(b); if (v) n.add(q.id); else n.delete(q.id); return n; })} />
                          <button onClick={() => remove(q.id)} className="inline-flex items-center gap-1 rounded-lg border border-maroon/15 px-2 py-1 text-xs text-stone-500 hover:text-red-700" title={t("remove")}><IconTrash className="h-4 w-4" /></button>
                        </div>
                      </div>
                      <QuestionBody q={q} selected={r.last_selected} reveal />
                      <SolutionBox q={q} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

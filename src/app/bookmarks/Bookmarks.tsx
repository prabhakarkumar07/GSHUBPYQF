"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers";
import { ConfigNotice, Empty, PageHeader, Spinner } from "@/components/ui";
import { QuestionBody, QuestionMeta, SolutionBox } from "@/components/QuestionBody";
import { BookmarkButton } from "@/components/BookmarkButton";
import { RichText } from "@/components/RichText";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Question, QuizMode } from "@/lib/types";
import { fetchQuizIds, startQuiz } from "../practice/startQuiz";

export function Bookmarks() {
  const { t, user, authReady, subjectName, pick, taxonomy, lang } = useApp();
  const router = useRouter();
  const [items, setItems] = useState<Question[] | null>(null);
  const [subject, setSubject] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!authReady || !user || !isSupabaseConfigured) return;
    (async () => {
      const sb = getSupabase();
      const { data: bm } = await sb.from("bookmarks").select("question_id, created_at").order("created_at", { ascending: false });
      const ids = (bm ?? []).map((b) => b.question_id as string);
      if (!ids.length) { setItems([]); return; }
      const { data: qs } = await sb.from("questions").select("*, high_priority").in("id", ids);
      const byId = new Map(((qs as Question[]) ?? []).map((q) => [q.id, q]));
      setItems(ids.map((id) => byId.get(id)).filter(Boolean) as Question[]);
    })();
  }, [authReady, user]);

  const quiz = async (mode: QuizMode) => {
    setStarting(true);
    try {
      const ids = await fetchQuizIds({ subjectIds: subject ? [subject] : [], count: 150, source: "bookmarks" });
      if (!ids.length) { setStarting(false); return; }
      const id = await startQuiz({ questionIds: ids, mode, source: "bookmarks", title: `Bookmarks · ${subject ? subjectName(subject) : "All"}`, config: { subject }, user, settings: taxonomy.settings });
      router.push(`/quiz/${id}`);
    } catch { setStarting(false); }
  };

  if (!isSupabaseConfigured) return <div className="container-page py-10"><ConfigNotice /></div>;
  if (!authReady || items === null) return <Spinner label={t("loading")} />;

  const subjects = [...new Set(items.map((q) => q.subject_id))];
  const shown = items.filter((q) => !subject || q.subject_id === subject);

  return (
    <div className={`container-page py-8 ${lang === "hi" ? "font-hindi" : ""}`}>
      <PageHeader title={t("bookmarks_title")} sub={t("bookmarks_sub")}>
        {items.length > 0 && (
          <>
            <button className="btn-gold" disabled={starting} onClick={() => quiz("practice")}>{t("quiz_bookmarks")}</button>
            <button className="btn-outline" disabled={starting} onClick={() => quiz("exam")}>{t("exam_mode")}</button>
          </>
        )}
      </PageHeader>
      {items.length === 0 ? (
        <Empty text={t("empty_bookmarks")} action={<Link href="/practice" className="btn-primary">{t("start_quiz")}</Link>} />
      ) : (
        <>
          <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
            <button className={!subject ? "chip-on shrink-0" : "chip-off shrink-0"} onClick={() => setSubject(null)}>{t("all_subjects")} <b>{items.length}</b></button>
            {subjects.map((sid) => (
              <button key={sid} className={subject === sid ? "chip-on shrink-0" : "chip-off shrink-0"} onClick={() => setSubject(sid)}>{subjectName(sid)} <b>{items.filter((q) => q.subject_id === sid).length}</b></button>
            ))}
          </div>
          <ul className="space-y-3">
            {shown.map((q) => {
              const isOpen = open === q.id;
              return (
                <li key={q.id} className="card overflow-hidden">
                  <div className="flex items-start gap-3 p-4">
                    <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(isOpen ? null : q.id)}>
                      <QuestionMeta q={q} />
                      <RichText html={pick(q.question_en, q.question_hi).replace(/<table[\s\S]*<\/table>/, " [table] ")} className="mt-2 line-clamp-2 text-[15px]" />
                    </button>
                    <BookmarkButton size="sm" questionId={q.id} bookmarked onChange={(v) => { if (!v) setItems((xs) => (xs ?? []).filter((x) => x.id !== q.id)); }} />
                  </div>
                  {isOpen && (
                    <div className="border-t border-maroon/10 p-4">
                      <QuestionBody q={q} selected={null} reveal />
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

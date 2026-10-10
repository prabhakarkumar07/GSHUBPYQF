"use client";
import { RichText } from "./RichText";
import { useApp } from "./providers";
import type { OptionKey, Question } from "@/lib/types";
import { IconCheck, IconX } from "./icons";

export function QuestionMeta({ q }: { q: Question }) {
  const { t, subjectName, topicName, examName } = useApp();
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      {q.exam_id && <span className="badge bg-maroon/90 text-white">{examName(q.exam_id)}</span>}
      <span className="badge bg-maroon-50 text-maroon">{subjectName(q.subject_id)}</span>
      {q.topic_id && <span className="badge bg-stone-100 text-stone-700">{topicName(q.topic_id)}</span>}
      <span className="badge bg-stone-100 text-stone-600">{t(q.difficulty)}</span>
      {q.high_priority && <span className="badge bg-gold text-maroon-900">★ {t("high_priority")}</span>}
      {q.source === "sample" && <span className="badge border border-dashed border-stone-300 text-stone-500">{t("sample")}</span>}
    </div>
  );
}

/**
 * Renders a question and its options.
 * - `reveal`: show correct / wrong colouring
 * - `onSelect`: makes options clickable
 */
export function QuestionBody({ q, selected, reveal, onSelect, communityCounts }: {
  q: Question;
  selected: OptionKey | null | undefined;
  reveal: boolean;
  onSelect?: (k: OptionKey) => void;
  communityCounts?: Record<string, number> | null;
}) {
  const { pick, lang } = useApp();
  const totalVotes = communityCounts ? Object.values(communityCounts).reduce((a, b) => a + b, 0) : 0;
  return (
    <div className={lang === "hi" ? "font-hindi" : ""}>
      <RichText html={pick(q.question_en, q.question_hi)} className="text-[16.5px] font-medium text-ink" />
      <div className="mt-4 space-y-2.5" role={onSelect ? "radiogroup" : undefined}>
        {q.options.map((o) => {
          const isSel = selected === o.key;
          const isCorrect = q.correct_option === o.key;
          let cls = "border-maroon/15 bg-white hover:border-maroon/40";
          if (!reveal && isSel) cls = "border-maroon bg-maroon-50 ring-2 ring-maroon/15";
          if (reveal && isCorrect) cls = "border-green-600 bg-green-50";
          else if (reveal && isSel && !isCorrect) cls = "border-red-500 bg-red-50";
          else if (reveal) cls = "border-maroon/10 bg-white opacity-80";
          const votes = communityCounts?.[o.key] ?? 0;
          return (
            <button
              key={o.key}
              type="button"
              role={onSelect ? "radio" : undefined}
              aria-checked={onSelect ? isSel : undefined}
              disabled={!onSelect}
              onClick={() => onSelect?.(o.key)}
              className={`relative flex w-full items-start gap-3 overflow-hidden rounded-xl border px-3.5 py-3 text-left transition disabled:cursor-default ${cls}`}
            >
              {reveal && totalVotes > 0 && (
                <span className="absolute inset-y-0 left-0 bg-stone-900/[.04]" style={{ width: `${(100 * votes) / totalVotes}%` }} aria-hidden />
              )}
              <span className={`relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${reveal && isCorrect ? "bg-green-600 text-white" : reveal && isSel ? "bg-red-500 text-white" : isSel ? "bg-maroon text-white" : "bg-maroon-50 text-maroon"}`}>
                {reveal && isCorrect ? <IconCheck className="h-4 w-4" /> : reveal && isSel ? <IconX className="h-4 w-4" /> : o.key}
              </span>
              <RichText html={pick(o.en, o.hi)} className="relative flex-1 pt-0.5 text-[15px]" />
              {reveal && totalVotes > 0 && (
                <span className="relative shrink-0 pt-1 text-xs tabular-nums text-stone-500">{Math.round((100 * votes) / totalVotes)}%</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SolutionBox({ q }: { q: Question }) {
  const { t, pick, lang } = useApp();
  const sol = pick(q.solution_en, q.solution_hi);
  return (
    <div className={`mt-4 rounded-xl border-l-4 border-gold bg-gold-50/70 p-4 ${lang === "hi" ? "font-hindi" : ""}`}>
      <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gold-700">{t("solution")} · {t("correct_answer")}: {q.correct_option}</div>
      {sol ? <RichText html={sol} className="text-[15px]" /> : <p className="text-sm text-stone-500">—</p>}
    </div>
  );
}

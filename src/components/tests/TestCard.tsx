"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers";
import { TEST_CATEGORIES, monthLabel, startTest, type TestSummary } from "@/lib/tests";

export function TestCard({ test }: { test: TestSummary }) {
  const { lang, user } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const hi = lang === "hi";
  const title = (hi ? test.title_hi || test.title_en : test.title_en) || test.title_hi || "";
  const desc = hi ? test.description_hi || test.description_en : test.description_en || test.description_hi;
  const maxMarks = Math.round(test.question_count * Number(test.positive_marks) * 100) / 100;
  const slug = TEST_CATEGORIES[test.category].slug;

  const start = async () => {
    if (!user) { router.push(`/login?next=${encodeURIComponent(`/tests/${slug}`)}`); return; }
    const msg = hi
      ? `टेस्ट शुरू करें?\n${test.question_count} प्रश्न · ${test.duration_min} मिनट · +${test.positive_marks} / −${test.negative_marks}\nटाइमर तुरंत शुरू हो जाएगा।`
      : `Start this test?\n${test.question_count} questions · ${test.duration_min} min · +${test.positive_marks} / −${test.negative_marks}\nThe timer starts immediately.`;
    if (!window.confirm(msg)) return;
    setBusy(true); setErr(null);
    try { const id = await startTest(test.id); router.push(`/quiz/${id}`); }
    catch (e) { setErr((e as Error).message); setBusy(false); }
  };

  return (
    <div className="card flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        {test.category === "monthly" && test.month
          ? <span className="badge bg-gold-50 text-maroon ring-1 ring-gold/40">{monthLabel(test.month, lang)}</span>
          : <span className="badge bg-maroon-50 text-maroon">{hi ? "पूर्ण प्रश्नपत्र" : "Full paper"}</span>}
        {!!test.my_attempts && <span className="badge bg-green-100 text-green-800">✓ {hi ? "दिया गया" : "Attempted"}</span>}
      </div>
      <h3 className="mt-3 text-lg font-bold leading-snug text-maroon">{title}</h3>
      {desc && <p className="mt-1 line-clamp-2 text-sm text-stone-600">{desc}</p>}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-cream px-2 py-2 ring-1 ring-maroon/5"><div className="font-display text-lg font-bold text-ink">{test.question_count}</div>{hi ? "प्रश्न" : "Questions"}</div>
        <div className="rounded-xl bg-cream px-2 py-2 ring-1 ring-maroon/5"><div className="font-display text-lg font-bold text-ink">{test.duration_min}</div>{hi ? "मिनट" : "Minutes"}</div>
        <div className="rounded-xl bg-cream px-2 py-2 ring-1 ring-maroon/5"><div className="font-display text-lg font-bold text-ink">{maxMarks}</div>{hi ? "अंक" : "Marks"}</div>
      </div>
      <p className="mt-2 text-center text-xs text-stone-500">{hi ? "अंकन" : "Marking"}: +{Number(test.positive_marks)} / −{Number(test.negative_marks)}</p>
      {!!test.my_attempts && test.my_best !== null && test.my_best !== undefined && (
        <p className="mt-2 text-center text-sm">
          {hi ? "आपका सर्वश्रेष्ठ" : "Your best"}: <b className="text-maroon">{Number(test.my_best)} / {maxMarks}</b>
          {test.my_last_attempt && <> · <Link href={`/result/${test.my_last_attempt}`} className="font-semibold text-maroon hover:underline">{hi ? "रिज़ल्ट देखें" : "View result"}</Link></>}
        </p>
      )}
      <div className="mt-auto pt-4">
        <button onClick={start} disabled={busy || test.question_count === 0} className="btn-primary w-full py-3">
          {busy ? (hi ? "शुरू हो रहा है…" : "Starting…") : test.my_attempts ? (hi ? "फिर से दें" : "Re-attempt") : (hi ? "टेस्ट शुरू करें" : "Start test")} →
        </button>
        {err && <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-800">{err}</p>}
      </div>
    </div>
  );
}

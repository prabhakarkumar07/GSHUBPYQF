"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers";
import { RichEditor } from "@/components/RichEditor";
import { QuestionBody, SolutionBox } from "@/components/QuestionBody";
import { getSupabase } from "@/lib/supabase/client";
import type { Difficulty, OptionKey, Question, QuestionOption } from "@/lib/types";

const KEYS: OptionKey[] = ["A", "B", "C", "D", "E"];
const PRESET_E = {
  more: { en: "More than one of the above", hi: "उपर्युक्त में से एक से अधिक" },
  none: { en: "None of the above", hi: "उपर्युक्त में से कोई नहीं" },
};

type Draft = Omit<Question, "id" | "created_at" | "updated_at" | "high_priority"> & { id?: string };

const EMPTY: Draft = {
  exam_id: null, year: null, subject_id: 0, topic_id: null, difficulty: "medium",
  question_en: "", question_hi: "", options: KEYS.slice(0, 4).map((key) => ({ key, en: "", hi: "" })),
  correct_option: "A", solution_en: "", solution_hi: "", is_dropped: false, is_high_priority: false, theme: "", source: "pyq",
};

export function QuestionForm({ id }: { id?: string }) {
  const { taxonomy, setLang, lang } = useApp();
  const router = useRouter();
  const [d, setD] = useState<Draft | null>(id ? null : EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!id) return;
    getSupabase().from("questions").select("*").eq("id", id).single().then(({ data, error }) => {
      if (error) setMsg({ ok: false, text: error.message });
      else {
        if (new URLSearchParams(window.location.search).get("saved")) setMsg({ ok: true, text: "Saved ✓" });
        setD({ ...(data as Question), question_hi: data.question_hi ?? "", solution_en: data.solution_en ?? "", solution_hi: data.solution_hi ?? "", theme: data.theme ?? "" });
      }
    });
  }, [id]);

  useEffect(() => {
    if (d && !d.subject_id && taxonomy.subjects[0]) setD({ ...d, subject_id: taxonomy.subjects[0].id });
  }, [taxonomy.subjects, d]);

  if (!d) return <p className="text-stone-500">{msg?.text ?? "Loading…"}</p>;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD({ ...d, [k]: v });
  const setOpt = (i: number, field: "en" | "hi", v: string) => {
    const options = d.options.map((o, j) => (j === i ? { ...o, [field]: v } : o));
    setD({ ...d, options });
  };
  const setOptionCount = (n: 4 | 5) => {
    const options: QuestionOption[] = KEYS.slice(0, n).map((key, i) => d.options[i] ?? { key, en: "", hi: "" });
    setD({ ...d, options, correct_option: KEYS.indexOf(d.correct_option) < n ? d.correct_option : "A" });
  };
  const topics = taxonomy.topics.filter((t) => t.subject_id === d.subject_id);

  const save = async (andNew = false) => {
    setMsg(null);
    const plain = (h: string | null) => (h ?? "").replace(/<[^>]+>/g, "").trim();
    if (!plain(d.question_en)) return setMsg({ ok: false, text: "English question text is required." });
    if (d.options.some((o) => !plain(o.en))) return setMsg({ ok: false, text: "Every option needs English text." });
    if (!d.subject_id) return setMsg({ ok: false, text: "Choose a subject." });
    setSaving(true);
    const payload = {
      exam_id: d.exam_id, year: d.year, subject_id: d.subject_id, topic_id: d.topic_id, difficulty: d.difficulty,
      question_en: d.question_en, question_hi: d.question_hi || null, options: d.options, correct_option: d.correct_option,
      solution_en: d.solution_en || null, solution_hi: d.solution_hi || null, is_dropped: d.is_dropped,
      is_high_priority: d.is_high_priority, theme: d.theme?.trim().toLowerCase().replace(/\s+/g, "-") || null, source: d.source,
    };
    const sb = getSupabase();
    const res = d.id
      ? await sb.from("questions").update(payload).eq("id", d.id).select("id").single()
      : await sb.from("questions").insert(payload).select("id").single();
    setSaving(false);
    if (res.error) return setMsg({ ok: false, text: res.error.message });
    setMsg({ ok: true, text: "Saved ✓" });
    if (andNew) {
      setD({ ...EMPTY, subject_id: d.subject_id, topic_id: d.topic_id, exam_id: d.exam_id, year: d.year });
      if (d.id) router.push("/admin/questions/new");
      window.scrollTo({ top: 0 });
    } else if (!d.id) {
      router.replace(`/admin/questions/${res.data.id}?saved=1`);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        {/* meta */}
        <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Exam / year">
            <select className="input" value={d.exam_id ?? ""} onChange={(e) => {
              const ex = taxonomy.exams.find((x) => x.id === Number(e.target.value));
              setD({ ...d, exam_id: ex?.id ?? null, year: ex?.year ?? d.year });
            }}>
              <option value="">— none —</option>
              {taxonomy.exams.map((x) => <option key={x.id} value={x.id}>{x.name_en}</option>)}
            </select>
          </Field>
          <Field label="Year"><input className="input" type="number" value={d.year ?? ""} onChange={(e) => set("year", e.target.value ? Number(e.target.value) : null)} /></Field>
          <Field label="Subject">
            <select className="input" value={d.subject_id} onChange={(e) => setD({ ...d, subject_id: Number(e.target.value), topic_id: null })}>
              {taxonomy.subjects.map((s) => <option key={s.id} value={s.id}>{s.name_en}</option>)}
            </select>
          </Field>
          <Field label="Topic">
            <select className="input" value={d.topic_id ?? ""} onChange={(e) => set("topic_id", e.target.value ? Number(e.target.value) : null)}>
              <option value="">— none —</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name_en}</option>)}
            </select>
          </Field>
          <Field label="Difficulty">
            <select className="input" value={d.difficulty} onChange={(e) => set("difficulty", e.target.value as Difficulty)}>
              <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
            </select>
          </Field>
          <Field label="Theme tag (repeated themes → High Priority)"><input className="input" placeholder="e.g. champaran" value={d.theme ?? ""} onChange={(e) => set("theme", e.target.value)} /></Field>
          <Field label="Source">
            <select className="input" value={d.source} onChange={(e) => set("source", e.target.value)}>
              <option value="pyq">BPSC PYQ</option><option value="current_affairs">Current Affairs</option><option value="test_series">Test Series</option><option value="sample">Sample</option>
            </select>
          </Field>
          <div className="flex flex-col justify-end gap-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-maroon" checked={d.is_high_priority} onChange={(e) => set("is_high_priority", e.target.checked)} /> ★ High priority</label>
            <label className="flex items-center gap-2 text-red-800"><input type="checkbox" className="h-4 w-4 accent-red-700" checked={d.is_dropped} onChange={(e) => set("is_dropped", e.target.checked)} /> Dropped by BPSC</label>
          </div>
        </div>

        {/* question */}
        <div className="card space-y-3 p-4">
          <h3 className="font-bold text-maroon">Question</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            <div><div className="label">English</div><RichEditor value={d.question_en} onChange={(v) => set("question_en", v)} placeholder="Question in English…" /></div>
            <div><div className="label">हिंदी</div><RichEditor hindi value={d.question_hi ?? ""} onChange={(v) => set("question_hi", v)} placeholder="प्रश्न हिंदी में…" /></div>
          </div>
        </div>

        {/* options */}
        <div className="card space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-maroon">Options & answer</h3>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <button type="button" className={d.options.length === 4 ? "chip-on !py-1" : "chip-off !py-1"} onClick={() => setOptionCount(4)}>4 options</button>
              <button type="button" className={d.options.length === 5 ? "chip-on !py-1" : "chip-off !py-1"} onClick={() => setOptionCount(5)}>5 options (A–E)</button>
              {d.options.length === 5 && (
                <>
                  <button type="button" className="chip-off !py-1" onClick={() => setD({ ...d, options: d.options.map((o) => (o.key === "E" ? { key: "E", ...PRESET_E.more } : o)) })}>E = More than one</button>
                  <button type="button" className="chip-off !py-1" onClick={() => setD({ ...d, options: d.options.map((o) => (o.key === "E" ? { key: "E", ...PRESET_E.none } : o)) })}>E = None</button>
                </>
              )}
            </div>
          </div>
          {d.options.map((o, i) => (
            <div key={o.key} className={`grid gap-2 rounded-xl p-2 lg:grid-cols-[auto_1fr_1fr] ${d.correct_option === o.key ? "bg-green-50 ring-1 ring-green-300" : ""}`}>
              <label className="flex items-center gap-2 lg:flex-col lg:justify-center" title="Mark as correct">
                <input type="radio" name="correct" className="h-4 w-4 accent-green-700" checked={d.correct_option === o.key} onChange={() => set("correct_option", o.key)} />
                <span className="font-bold text-maroon">{o.key}</span>
              </label>
              <RichEditor compact value={o.en} onChange={(v) => setOpt(i, "en", v)} placeholder={`Option ${o.key} (English)`} />
              <RichEditor compact hindi value={o.hi} onChange={(v) => setOpt(i, "hi", v)} placeholder={`विकल्प ${o.key} (हिंदी)`} />
            </div>
          ))}
        </div>

        {/* solution */}
        <div className="card space-y-3 p-4">
          <h3 className="font-bold text-maroon">Solution — explain why each option is right or wrong</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            <div><div className="label">English</div><RichEditor value={d.solution_en ?? ""} onChange={(v) => set("solution_en", v)} placeholder="Correct: (B) … (A) is wrong because …" /></div>
            <div><div className="label">हिंदी</div><RichEditor hindi value={d.solution_hi ?? ""} onChange={(v) => set("solution_hi", v)} placeholder="सही उत्तर: (B) … (A) गलत है क्योंकि …" /></div>
          </div>
        </div>
      </div>

      {/* actions + preview */}
      <aside className="space-y-3 xl:sticky xl:top-24 xl:h-fit">
        <div className="card space-y-2 p-4">
          <button className="btn-primary w-full" disabled={saving} onClick={() => save(false)}>{saving ? "Saving…" : "Save question"}</button>
          <button className="btn-outline w-full" disabled={saving} onClick={() => save(true)}>Save & add another</button>
          <button className="btn-ghost w-full" onClick={() => setPreview((p) => !p)}>{preview ? "Hide" : "Show"} student preview</button>
          {msg && <p className={`rounded-lg p-2 text-sm ${msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{msg.text}</p>}
        </div>
        {preview && (
          <div className="card p-4">
            <div className="mb-3 flex gap-1 text-xs">
              <button className={lang === "en" ? "chip-on !py-1" : "chip-off !py-1"} onClick={() => setLang("en")}>English</button>
              <button className={lang === "hi" ? "chip-on !py-1" : "chip-off !py-1"} onClick={() => setLang("hi")}>हिंदी</button>
            </div>
            <QuestionBody q={{ ...(d as Question), id: d.id ?? "preview" }} selected={null} reveal />
            <SolutionBox q={{ ...(d as Question), id: d.id ?? "preview" }} />
          </div>
        )}
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="label !text-xs">{label}</span>{children}</label>;
}

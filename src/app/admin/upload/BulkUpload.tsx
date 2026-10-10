"use client";
import { useEffect, useState } from "react";
import Papa from "papaparse";
import readXlsxFile from "read-excel-file";
import { useApp } from "@/components/providers";
import { getSupabase } from "@/lib/supabase/client";
import { stripHtml, textToHtml } from "@/lib/html";
import type { Exam, OptionKey, Subject, Topic } from "@/lib/types";

const KEYS: OptionKey[] = ["A", "B", "C", "D", "E"];
export const TEMPLATE_HEADERS = [
  "Year", "Exam", "Subject", "Topic", "Question_En", "Question_Hi",
  ...KEYS.flatMap((k) => [`Option_${k}_En`, `Option_${k}_Hi`]),
  "Answer", "Solution_En", "Solution_Hi", "Difficulty", "Is_Dropped", "Theme", "High_Priority",
];

type Raw = Record<string, string>;
interface Parsed {
  row: number;
  raw: Raw;
  errors: string[];
  subject?: Subject;
  topicName?: string;
  topic?: Topic;
  examName?: string;
  exam?: Exam;
  payload?: Record<string, unknown>;
}

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9ऀ-ॿ]/g, "");
const truthy = (s: string) => ["1", "yes", "y", "true", "dropped", "हाँ"].includes(String(s ?? "").trim().toLowerCase());

function normaliseRow(r: Record<string, unknown>): Raw {
  const out: Raw = {};
  for (const [k, v] of Object.entries(r)) out[norm(k)] = v === null || v === undefined ? "" : String(v).trim();
  return out;
}

export interface BulkUploadProps {
  /** When set, questions are imported into this test (not the practice bank). */
  testId?: string;
  /** Used when a row's Subject is empty or unknown (test uploads only). */
  defaultSubjectId?: number;
  /** test_position of the first imported row (append after existing questions). */
  startPosition?: number;
  onImported?: (n: number) => void;
  embedded?: boolean;
}

export function BulkUpload({ testId, defaultSubjectId, startPosition = 0, onImported, embedded }: BulkUploadProps = {}) {
  const { taxonomy, reloadTaxonomy } = useApp();
  const [rows, setRows] = useState<Parsed[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [createMissing, setCreateMissing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const downloadTemplate = () => {
    const example = [
      "2024", "70th", "Polity", "Fundamental Rights & Duties",
      "Which Article abolishes untouchability?", "कौन-सा अनुच्छेद अस्पृश्यता का उन्मूलन करता है?",
      "Article 14", "अनुच्छेद 14", "Article 15", "अनुच्छेद 15", "Article 17", "अनुच्छेद 17", "Article 21", "अनुच्छेद 21",
      "More than one of the above", "उपर्युक्त में से एक से अधिक",
      "C", "Article 17 abolishes untouchability. (A) equality before law… ", "अनुच्छेद 17 अस्पृश्यता का अंत करता है…", "easy", "No", "fundamental-rights", "No",
    ];
    const csv = Papa.unparse({ fields: TEMPLATE_HEADERS, data: [example] });
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gshub-pyq-upload-template.csv";
    a.click();
  };

  const parseFile = async (file: File) => {
    setResult(null); setFileName(file.name);
    let records: Record<string, unknown>[] = [];
    if (/\.xlsx$/i.test(file.name)) {
      const sheet = await readXlsxFile(file);
      const [header, ...body] = sheet;
      records = body.map((r) => Object.fromEntries(header.map((h, i) => [String(h ?? ""), r[i] ?? ""])));
    } else {
      const text = await file.text();
      const res = Papa.parse<Record<string, unknown>>(text.replace(/^﻿/, ""), { header: true, skipEmptyLines: "greedy" });
      records = res.data;
    }
    setRows(records.map((r, i) => validate(normaliseRow(r), i + 2)));
  };

  const findSubject = (v: string) => taxonomy.subjects.find((s) => [s.slug, s.name_en, s.name_hi].some((x) => norm(x) === norm(v)));
  const findTopic = (subjectId: number, v: string) => taxonomy.topics.find((t) => t.subject_id === subjectId && [t.slug, t.name_en, t.name_hi].some((x) => norm(x) === norm(v)));
  const findExam = (v: string, year: number | null) => {
    if (v) return taxonomy.exams.find((e) => [e.short_name, e.name_en, e.name_hi].some((x) => norm(x) === norm(v)) || norm(e.short_name).startsWith(norm(v)));
    if (year) { const m = taxonomy.exams.filter((e) => e.year === year); return m.length === 1 ? m[0] : undefined; }
    return undefined;
  };

  const validate = (r: Raw, row: number): Parsed => {
    const errors: string[] = [];
    const p: Parsed = { row, raw: r, errors };
    const qEn = r["questionen"] || (testId ? r["questionhi"] : "");
    if (!qEn) errors.push(testId ? "Question is empty" : "Question_En is empty");
    let subject = findSubject(r["subject"]);
    if (!subject && testId && defaultSubjectId) subject = taxonomy.subjects.find((x) => x.id === defaultSubjectId);
    if (!subject) errors.push(`Unknown subject “${r["subject"] || ""}”`);
    p.subject = subject;
    if (subject && r["topic"]) {
      p.topic = findTopic(subject.id, r["topic"]);
      if (!p.topic) { p.topicName = r["topic"]; if (!createMissing) errors.push(`Unknown topic “${r["topic"]}”`); }
    }
    const year = r["year"] ? parseInt(r["year"], 10) : null;
    p.exam = findExam(r["exam"], year);
    if (!p.exam && r["exam"]) { p.examName = r["exam"]; if (!createMissing) errors.push(`Unknown exam “${r["exam"]}”`); }

    const options = KEYS.map((k) => {
      const en = r[`option${k.toLowerCase()}en`] ?? "", hi = r[`option${k.toLowerCase()}hi`] ?? "";
      return { key: k, en: en || (testId ? hi : ""), hi };
    })
      .filter((o) => o.en || o.hi);
    if (options.length < 2) errors.push("Need at least 2 options");
    if (options.some((o, i) => o.key !== KEYS[i])) errors.push("Options must be filled in order A, B, C…");
    if (options.some((o) => !o.en)) errors.push("Every option needs English text");

    let ans = (r["answer"] || "").toUpperCase().replace(/[^A-E1-5]/g, "");
    if (/^[1-5]$/.test(ans)) ans = KEYS[Number(ans) - 1];
    if (!/^[A-E]$/.test(ans)) errors.push(`Answer “${r["answer"] || ""}” must be A–E`);
    else if (!options.some((o) => o.key === ans)) errors.push(`Answer ${ans} has no option text`);

    const diff = (r["difficulty"] || "medium").toLowerCase();
    if (!["easy", "medium", "hard"].includes(diff)) errors.push(`Difficulty “${r["difficulty"]}” must be easy/medium/hard`);

    p.payload = {
      year: year ?? p.exam?.year ?? null,
      difficulty: ["easy", "medium", "hard"].includes(diff) ? diff : "medium",
      question_en: textToHtml(qEn),
      question_hi: textToHtml(r["questionhi"]) || null,
      options: options.map((o) => ({ key: o.key, en: o.en, hi: o.hi || o.en })),
      correct_option: ans,
      solution_en: textToHtml(r["solutionen"]) || null,
      solution_hi: textToHtml(r["solutionhi"]) || null,
      is_dropped: truthy(r["isdropped"]),
      is_high_priority: truthy(r["highpriority"]),
      theme: r["theme"] ? r["theme"].toLowerCase().replace(/\s+/g, "-") : null,
      source: testId ? "test_series" : "pyq",
      ...(testId ? { test_id: testId } : {}),
    };
    return p;
  };

  // re-check rows when the "create missing" option changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setRows((rs) => (rs ? rs.map((p) => validate(p.raw, p.row)) : rs)); }, [createMissing, taxonomy, defaultSubjectId]);

  const doImport = async () => {
    if (!rows) return;
    const valid = rows.filter((r) => r.errors.length === 0);
    if (!valid.length) return;
    setBusy(true); setResult(null);
    const sb = getSupabase();
    try {
      // create missing exams & topics first
      const examIds = new Map<string, number>();
      for (const name of [...new Set(valid.filter((r) => !r.exam && r.examName).map((r) => r.examName!))]) {
        const year = valid.find((r) => r.examName === name)?.payload?.year as number | null;
        const { data, error } = await sb.from("exams").insert({ short_name: name.slice(0, 40), name_en: name, name_hi: name, year, sort_order: 999 }).select("id").single();
        if (error) throw new Error(`Creating exam “${name}”: ${error.message}`);
        examIds.set(name, data.id);
      }
      const topicIds = new Map<string, number>();
      for (const r of valid.filter((x) => !x.topic && x.topicName && x.subject)) {
        const key = `${r.subject!.id}::${norm(r.topicName)}`;
        if (topicIds.has(key)) continue;
        const slug = r.topicName!.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `topic-${Date.now()}`;
        const { data, error } = await sb.from("topics").insert({ subject_id: r.subject!.id, slug, name_en: r.topicName, name_hi: r.topicName, sort_order: 999 }).select("id").single();
        if (error) throw new Error(`Creating topic “${r.topicName}”: ${error.message}`);
        topicIds.set(key, data.id);
      }
      const payloads = valid.map((r, i) => ({
        ...r.payload,
        ...(testId ? { test_position: startPosition + i + 1 } : {}),
        subject_id: r.subject!.id,
        topic_id: r.topic?.id ?? (r.topicName ? topicIds.get(`${r.subject!.id}::${norm(r.topicName)}`) : null) ?? null,
        exam_id: r.exam?.id ?? (r.examName ? examIds.get(r.examName) : null) ?? null,
      }));
      let inserted = 0;
      for (let i = 0; i < payloads.length; i += 100) {
        const { error } = await sb.from("questions").insert(payloads.slice(i, i + 100));
        if (error) throw new Error(`Rows ${i + 1}–${i + 100}: ${error.message}`);
        inserted += Math.min(100, payloads.length - i);
      }
      setResult(`Imported ${inserted} question${inserted === 1 ? "" : "s"}${examIds.size ? `, created ${examIds.size} exam(s)` : ""}${topicIds.size ? `, created ${topicIds.size} topic(s)` : ""}.`);
      setRows(null);
      onImported?.(inserted);
      await reloadTaxonomy();
    } catch (e) {
      setResult("Import stopped: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const ok = rows?.filter((r) => !r.errors.length).length ?? 0;
  const bad = (rows?.length ?? 0) - ok;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {embedded ? (
          <p className="max-w-2xl text-sm text-stone-600">Same Excel/CSV format as Bulk upload. Questions are added to <b>this test only</b>, in file order. Hindi-only questions are fine. If Subject is empty, the default subject below is used.</p>
        ) : (
        <div>
          <h1 className="h-display text-2xl">Bulk upload (Excel / CSV)</h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">One question per row. Subject must match an existing subject (English or Hindi name). Unknown topics and exams can be created automatically. Plain text is converted to paragraphs; HTML (e.g. a &lt;table&gt; for Match List-I/II) is kept as is. For PYQ full-length tests and monthly MCQs, upload from <b>Admin → Tests</b> instead.</p>
        </div>
        )}
        <button onClick={downloadTemplate} className="btn-outline">⬇ Download template</button>
      </div>

      <div className="card p-5">
        <div className="mb-3 text-xs text-stone-500"><b>Columns:</b> {TEMPLATE_HEADERS.join(", ")}</div>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-maroon/25 bg-maroon-50/30 px-4 py-10 text-center hover:bg-maroon-50/60">
          <span className="text-3xl">📄</span>
          <span className="font-semibold text-maroon">{fileName || "Choose .xlsx or .csv file"}</span>
          <span className="text-xs text-stone-500">UTF-8 CSV recommended for Hindi text</span>
          <input type="file" accept=".csv,.xlsx" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); e.target.value = ""; }} />
        </label>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-maroon" checked={createMissing} onChange={(e) => setCreateMissing(e.target.checked)} /> Create missing topics and exams automatically</label>
      </div>

      {result && <p className={`rounded-xl p-4 text-sm ${result.startsWith("Imported") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{result}</p>}

      {rows && (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-maroon/10 px-4 py-3">
            <div className="text-sm"><b className="text-green-700">{ok} ready</b>{bad > 0 && <> · <b className="text-red-700">{bad} with errors</b> (skipped)</>}</div>
            <button className="btn-primary" disabled={busy || ok === 0} onClick={doImport}>{busy ? "Importing…" : `Import ${ok} question${ok === 1 ? "" : "s"}`}</button>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 bg-white text-left text-xs uppercase text-stone-500 shadow-sm"><tr><th className="px-4 py-2">Row</th><th className="px-2">Question</th><th className="px-2">Subject / topic</th><th className="px-2">Exam</th><th className="px-2">Ans</th><th className="px-4">Status</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.row} className={`border-t border-maroon/5 align-top ${r.errors.length ? "bg-red-50/50" : ""}`}>
                    <td className="px-4 py-2 tabular-nums text-stone-500">{r.row}</td>
                    <td className="max-w-sm px-2 py-2">{stripHtml(r.raw["questionen"], 100)}</td>
                    <td className="px-2 py-2">{r.subject?.name_en ?? r.raw["subject"]}<div className="text-xs text-stone-500">{r.topic?.name_en ?? (r.topicName ? `${r.topicName} (new)` : "—")}</div></td>
                    <td className="px-2 py-2 text-stone-600">{r.exam?.short_name ?? (r.examName ? `${r.examName} (new)` : r.raw["year"] || "—")}</td>
                    <td className="px-2 py-2 font-bold">{r.payload?.correct_option as string}</td>
                    <td className="px-4 py-2">{r.errors.length ? <span className="text-xs text-red-700">{r.errors.join("; ")}</span> : <span className="badge bg-green-100 text-green-800">OK</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

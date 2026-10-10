"use client";
import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/scoring";
import { Spinner, Stat } from "@/components/ui";
import { downloadCsv, toCsv } from "../csv";

interface AttemptRow {
  attempt_id: string; user_id: string; full_name: string | null; email: string | null; phone: string | null;
  title: string | null; mode: "practice" | "exam"; status: string; score: number | null; max_score: number | null;
  total_count: number | null; correct_count: number | null; wrong_count: number | null; skipped_count: number | null;
  accuracy: number | null; time_taken_sec: number | null; started_at: string; submitted_at: string | null; total_rows: number;
}
interface DetailRow { q_no: number; question_id: string; question_en: string; subject: string | null; topic: string | null; selected_option: string | null; correct_option: string; is_correct: boolean | null }

const PAGE = 50;
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—");
const accColor = (a: number | null) => (a === null ? "text-stone-400" : a >= 70 ? "text-green-700" : a >= 40 ? "text-amber-700" : "text-red-700");


export function StudentsResults() {
  const sp = useSearchParams();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"" | "practice" | "exam">("");
  const [student, setStudent] = useState<{ id: string; name: string } | null>(sp.get("user") ? { id: sp.get("user")!, name: sp.get("name") || "Student" } : null);
  const [page, setPage] = useState(0);
  const [attempts, setAttempts] = useState<AttemptRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, DetailRow[]>>({});

  const load = useCallback(async () => {
    setError(null);
    const sb = getSupabase();
      const { data, error } = await sb.rpc("admin_list_attempts", {
        p_search: search.trim() || null, p_mode: mode || null, p_status: "submitted",
        p_user: student?.id ?? null, p_limit: PAGE, p_offset: page * PAGE,
      });
      if (error) setError(error.message); else setAttempts((data as AttemptRow[]) ?? []);
  }, [search, mode, student, page]);

  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); }, [load]);
  useEffect(() => { setPage(0); }, [search, mode, student]);

  const openDetail = async (id: string) => {
    setOpen(open === id ? null : id);
    if (detail[id]) return;
    const { data } = await getSupabase().rpc("admin_attempt_detail", { p_attempt: id });
    setDetail((d) => ({ ...d, [id]: (data as DetailRow[]) ?? [] }));
  };

  const exportCsv = async () => {
    const sb = getSupabase();
      const { data } = await sb.rpc("admin_list_attempts", { p_search: search.trim() || null, p_mode: mode || null, p_status: "submitted", p_user: student?.id ?? null, p_limit: 1000, p_offset: 0 });
      downloadCsv(`gshub-quiz-results-${new Date().toISOString().slice(0, 10)}.csv`, toCsv((data as Record<string, unknown>[]) ?? []));
  };

  const rows = attempts;
  const total = rows?.[0]?.total_rows ?? 0;

  if (error && /admin_list|function/i.test(error)) {
    return (
      <div className="card p-6">
        <h1 className="h-display text-xl">One-time setup needed</h1>
        <p className="mt-2 text-sm text-stone-600">Run <code className="rounded bg-maroon-50 px-1">supabase/migrations/003_admin_results.sql</code> in Supabase → SQL Editor, then refresh this page.</p>
        <p className="mt-2 text-xs text-stone-400">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="h-display text-2xl">Quiz results</h1>
        <button onClick={exportCsv} className="btn-outline">⬇ Download Excel (CSV)</button>
      </div>

      <p className="-mt-2 mb-4 text-sm text-stone-500">Every submitted quiz with marks. For the list of everyone who signed up (mobile, exam), open <Link href="/admin/users" className="font-semibold text-maroon hover:underline">All users</Link>.</p>

      <div className="card mb-4 grid gap-2 p-3 sm:grid-cols-[1fr_auto]">
        <input className="input" placeholder="Search by student name, email or quiz…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {(
          <select className="input" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
            <option value="">Practice + Exam</option><option value="exam">Exam mode only</option><option value="practice">Practice mode only</option>
          </select>
        )}
      </div>

      {student && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-gold-50 px-4 py-2.5 text-sm">
          <span>Showing results of <b className="text-maroon">{student.name}</b></span>
          <button onClick={() => setStudent(null)} className="font-semibold text-maroon">✕ Show everyone</button>
        </div>
      )}

      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {rows === null ? <Spinner /> : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat accent label="Quizzes submitted" value={total.toLocaleString("en-IN")} />
            <Stat label="Avg accuracy (this page)" value={avg((attempts ?? []).map((a) => a.accuracy)) + "%"} />
            <Stat label="Exam-mode (this page)" value={(attempts ?? []).filter((a) => a.mode === "exam").length} />
            <Stat label="Students (this page)" value={new Set((attempts ?? []).map((a) => a.user_id)).size} />
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-maroon-50/60 text-left text-xs uppercase text-stone-500">
                  <tr><th className="px-4 py-2.5">Student</th><th className="px-2">Quiz</th><th className="px-2 text-right">Marks</th><th className="px-2 text-center">✓ / ✗ / —</th><th className="px-2 text-right">Accuracy</th><th className="px-2 text-right">Time</th><th className="px-2">Submitted</th><th className="px-4"></th></tr>
                </thead>
                <tbody>
                  {(attempts ?? []).map((a) => (
                    <Fragment key={a.attempt_id}>
                      <tr className="border-t border-maroon/5 align-top hover:bg-maroon-50/30">
                        <td className="px-4 py-2.5">
                          <button className="text-left font-medium text-maroon hover:underline" onClick={() => setStudent({ id: a.user_id, name: a.full_name || a.email || "Student" })}>{a.full_name || "—"}</button>
                          <div className="text-xs text-stone-500">{a.email}{a.phone ? ` · ${a.phone}` : ""}</div>
                        </td>
                        <td className="px-2 py-2.5"><div className="max-w-[220px] truncate">{a.title || "Quiz"}</div><span className={`badge ${a.mode === "exam" ? "bg-maroon text-white" : "bg-stone-100 text-stone-600"}`}>{a.mode}</span></td>
                        <td className="px-2 py-2.5 text-right"><b className="font-display text-base text-maroon">{a.score ?? "—"}</b><span className="text-xs text-stone-500"> / {a.max_score ?? a.total_count}</span></td>
                        <td className="px-2 py-2.5 text-center tabular-nums"><span className="text-green-700">{a.correct_count ?? 0}</span> / <span className="text-red-700">{a.wrong_count ?? 0}</span> / <span className="text-stone-500">{a.skipped_count ?? 0}</span></td>
                        <td className={`px-2 py-2.5 text-right font-semibold tabular-nums ${accColor(a.accuracy)}`}>{a.accuracy !== null ? `${a.accuracy}%` : "—"}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-stone-600">{a.time_taken_sec ? formatDuration(a.time_taken_sec) : "—"}</td>
                        <td className="px-2 py-2.5 text-stone-600">{fmtDate(a.submitted_at)}</td>
                        <td className="px-4 py-2.5 text-right"><button onClick={() => openDetail(a.attempt_id)} className="rounded-md border border-maroon/15 px-2 py-1 text-xs text-maroon hover:bg-maroon-50">{open === a.attempt_id ? "Hide" : "Answers"}</button></td>
                      </tr>
                      {open === a.attempt_id && (
                        <tr className="bg-cream">
                          <td colSpan={8} className="px-4 py-3">
                            {!detail[a.attempt_id] ? <Spinner /> : (
                              <ol className="grid gap-1.5 text-xs sm:grid-cols-2">
                                {detail[a.attempt_id].map((d) => (
                                  <li key={d.question_id} className="flex gap-2 rounded-lg bg-white p-2 ring-1 ring-maroon/5">
                                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${d.is_correct === true ? "bg-green-600 text-white" : d.is_correct === false ? "bg-red-500 text-white" : "bg-stone-200 text-stone-600"}`}>{d.q_no}</span>
                                    <span className="min-w-0 flex-1"><span className="line-clamp-2">{d.question_en}</span><span className="text-stone-500">{d.subject}{d.topic ? ` · ${d.topic}` : ""} · Answered <b>{d.selected_option ?? "—"}</b> · Correct <b className="text-green-700">{d.correct_option}</b></span></span>
                                  </li>
                                ))}
                              </ol>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {attempts?.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-stone-500">No submitted quizzes yet.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={total} setPage={setPage} />
          </div>
        </>
      )}
    </div>
  );
}

function avg(xs: (number | null)[]): string {
  const v = xs.filter((x): x is number => x !== null && x !== undefined).map(Number);
  return v.length ? (Math.round((10 * v.reduce((a, b) => a + b, 0)) / v.length) / 10).toString() : "—";
}

function Pager({ page, total, setPage }: { page: number; total: number; setPage: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between border-t border-maroon/10 px-4 py-3 text-sm">
      <span className="text-stone-500">{total ? `${page * PAGE + 1}–${Math.min(total, (page + 1) * PAGE)} of ${total}` : "0"}</span>
      <div className="flex gap-2">
        <button className="btn-outline !py-1.5" disabled={page === 0} onClick={() => setPage(page - 1)}>← Prev</button>
        <button className="btn-outline !py-1.5" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)}>Next →</button>
      </div>
    </div>
  );
}

"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import { Spinner, Stat } from "@/components/ui";
import { TARGET_EXAMS } from "@/lib/exams";
import { downloadCsv, toCsv } from "../csv";

interface UserRow {
  user_id: string; full_name: string | null; email: string | null; phone: string | null; target_exam: string | null;
  role: string | null; joined_at: string; quizzes: number; questions_answered: number; accuracy: number | null;
  avg_score_pct: number | null; mistakes: number; last_active: string | null; total_rows: number;
}
interface ExamCount { target_exam: string; users: number }

const PAGE = 50;
const examLabel = (v: string | null) => (v ? TARGET_EXAMS.find((e) => e.value === v)?.en ?? v : "Not filled");
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—");
const accColor = (a: number | null) => (a === null ? "text-stone-400" : a >= 70 ? "text-green-700" : a >= 40 ? "text-amber-700" : "text-red-700");

export function AllUsers() {
  const [search, setSearch] = useState("");
  const [exam, setExam] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [counts, setCounts] = useState<ExamCount[]>([]);
  const [error, setError] = useState<string | null>(null);

  const params = useCallback((limit: number, offset: number) => ({
    p_search: search.trim() || null, p_exam: exam || null, p_limit: limit, p_offset: offset,
  }), [search, exam]);

  const load = useCallback(async () => {
    setError(null);
    const { data, error } = await getSupabase().rpc("admin_list_students", params(PAGE, page * PAGE));
    if (error) setError(error.message); else setRows((data as UserRow[]) ?? []);
  }, [params, page]);

  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); }, [load]);
  useEffect(() => { setPage(0); }, [search, exam]);
  useEffect(() => {
    getSupabase().rpc("admin_exam_counts").then(({ data }) => setCounts(((data as ExamCount[]) ?? []).map((c) => ({ ...c, users: Number(c.users) }))));
  }, []);

  const exportCsv = async () => {
    const { data } = await getSupabase().rpc("admin_list_students", params(1000, 0));
    downloadCsv(`gshub-all-users-${new Date().toISOString().slice(0, 10)}.csv`, toCsv((data as Record<string, unknown>[]) ?? []));
  };

  if (error && /admin_list|admin_exam|function|p_exam/i.test(error)) {
    return (
      <div className="card p-6">
        <h1 className="h-display text-xl">One-time setup needed</h1>
        <p className="mt-2 text-sm text-stone-600">Run <code className="rounded bg-maroon-50 px-1">supabase/migrations/003_admin_results.sql</code> and then <code className="rounded bg-maroon-50 px-1">004_profile_fields.sql</code> in Supabase → SQL Editor, then refresh this page.</p>
        <p className="mt-2 text-xs text-stone-400">{error}</p>
      </div>
    );
  }

  const total = Number(rows?.[0]?.total_rows ?? 0);
  const allUsers = counts.reduce((a, c) => a + c.users, 0);
  const withPhone = (rows ?? []).filter((r) => r.phone).length;
  const active = (rows ?? []).filter((r) => r.quizzes > 0).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="h-display text-2xl">All users</h1>
        <button onClick={exportCsv} className="btn-outline">⬇ Download Excel (CSV)</button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat accent label="Total sign-ups" value={allUsers.toLocaleString("en-IN")} />
        <Stat label={exam ? "In this exam" : "Matching search"} value={total.toLocaleString("en-IN")} />
        <Stat label="With mobile (this page)" value={withPhone} />
        <Stat label="Attempted a quiz (this page)" value={active} />
      </div>

      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setExam("")} className={`shrink-0 ${exam === "" ? "chip-on" : "chip-off"}`}>All exams · {allUsers}</button>
        {counts.filter((c) => c.target_exam !== "—").map((c) => (
          <button key={c.target_exam} onClick={() => setExam(c.target_exam)} className={`shrink-0 ${exam === c.target_exam ? "chip-on" : "chip-off"}`}>
            {examLabel(c.target_exam)} · {c.users}
          </button>
        ))}
      </div>

      <div className="card mb-4 p-3">
        <input className="input" placeholder="Search by name, email or mobile number…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {rows === null ? <Spinner /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-maroon-50/60 text-left text-xs uppercase text-stone-500">
                <tr><th className="px-4 py-2.5">Name</th><th className="px-2">Mobile</th><th className="px-2">Preparing for</th><th className="px-2 text-right">Quizzes</th><th className="px-2 text-right">Accuracy</th><th className="px-2 text-right">Avg marks</th><th className="px-2">Last active</th><th className="px-2">Joined</th><th className="px-4"></th></tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.user_id} className="border-t border-maroon/5 hover:bg-maroon-50/30">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-ink">{u.full_name || "—"} {u.role === "admin" && <span className="badge bg-gold text-maroon-900">admin</span>}</div>
                      <div className="text-xs text-stone-500">{u.email}</div>
                    </td>
                    <td className="px-2 py-2.5 whitespace-nowrap">
                      {u.phone ? (
                        <>
                          <a href={`tel:+91${u.phone.replace(/\D/g, "").slice(-10)}`} className="font-medium tabular-nums text-maroon hover:underline">{u.phone}</a>
                          <a href={`https://wa.me/91${u.phone.replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noopener noreferrer" className="ml-2 rounded bg-green-50 px-1.5 py-0.5 text-xs font-semibold text-green-700 hover:bg-green-100">WhatsApp</a>
                        </>
                      ) : <span className="text-stone-400">—</span>}
                    </td>
                    <td className="px-2 py-2.5">{u.target_exam ? <span className="badge bg-maroon-50 text-maroon">{examLabel(u.target_exam)}</span> : <span className="text-xs text-stone-400">Not filled</span>}</td>
                    <td className="px-2 text-right tabular-nums">{u.quizzes}</td>
                    <td className={`px-2 text-right font-semibold tabular-nums ${accColor(u.accuracy)}`}>{u.accuracy !== null ? `${u.accuracy}%` : "—"}</td>
                    <td className="px-2 text-right tabular-nums">{u.avg_score_pct !== null ? `${u.avg_score_pct}%` : "—"}</td>
                    <td className="px-2 text-stone-600">{fmtDate(u.last_active)}</td>
                    <td className="px-2 text-stone-600">{new Date(u.joined_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}</td>
                    <td className="px-4 text-right">{u.quizzes > 0 && (
                      <Link href={`/admin/students?user=${u.user_id}&name=${encodeURIComponent(u.full_name || u.email || "Student")}`} className="whitespace-nowrap rounded-md border border-maroon/15 px-2 py-1 text-xs text-maroon hover:bg-maroon-50">Results →</Link>
                    )}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-stone-500">No users found.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-maroon/10 px-4 py-3 text-sm">
            <span className="text-stone-500">{total ? `${page * PAGE + 1}–${Math.min(total, (page + 1) * PAGE)} of ${total}` : "0"}</span>
            <div className="flex gap-2">
              <button className="btn-outline !py-1.5" disabled={page === 0} onClick={() => setPage(page - 1)}>← Prev</button>
              <button className="btn-outline !py-1.5" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

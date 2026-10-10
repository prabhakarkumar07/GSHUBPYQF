"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/providers";
import { getSupabase } from "@/lib/supabase/client";
import { stripHtml } from "@/lib/html";
import type { Question } from "@/lib/types";
import { MAX_BULK, isTrashSetupError } from "../QuestionList";

type Row = Question & { deleted_at: string };

export function TrashList() {
  const { taxonomy, subjectName } = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [purge, setPurge] = useState<string[] | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [needSetup, setNeedSetup] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = getSupabase().from("questions").select("*", { count: "exact" }).not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }).order("id").range(page * MAX_BULK, page * MAX_BULK + MAX_BULK - 1);
    const term = q.trim().replace(/[%,()]/g, " ");
    if (term) query = query.or(`question_en.ilike.%${term}%,question_hi.ilike.%${term}%`);
    const { data, count, error } = await query;
    if (isTrashSetupError(error?.message)) setNeedSetup(true);
    setRows((data as Row[]) ?? []); setTotal(count ?? 0); setLoading(false);
  }, [page, q]);

  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); }, [load]);
  useEffect(() => { setPage(0); setSelected(new Set()); }, [q]);

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const togglePage = () => setSelected((s) => { const n = new Set(s); rows.forEach((r) => (allOnPage ? n.delete(r.id) : n.add(r.id))); return n; });

  const restore = async (ids: string[]) => {
    if (ids.length > MAX_BULK) { setMsg(`You can restore at most ${MAX_BULK} questions at a time.`); return; }
    setBusy(true); setMsg(null);
    const { data, error } = await getSupabase().rpc("admin_restore_questions", { p_ids: ids });
    if (error) setMsg(error.message);
    else { setMsg(`${data ?? ids.length} question(s) restored to the question bank.`); setSelected(new Set()); load(); }
    setBusy(false);
  };

  const runPurge = async () => {
    if (!purge) return;
    setBusy(true); setMsg(null);
    const { data, error } = await getSupabase().rpc("admin_purge_questions", { p_ids: purge.slice(0, MAX_BULK) });
    if (error) setMsg(error.message);
    else { setMsg(`${data ?? purge.length} question(s) deleted permanently.`); setSelected(new Set()); setPurge(null); setConfirmText(""); load(); }
    setBusy(false);
  };

  const fmt = (d: string) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/questions" className="text-sm font-semibold text-maroon hover:underline">← Back to questions</Link>
          <h1 className="h-display mt-1 text-2xl">🗑 Deleted questions <span className="text-base font-normal text-stone-500">({total})</span></h1>
          <p className="mt-1 text-sm text-stone-500">Deleted questions are hidden from students. Restore them, or delete permanently (max {MAX_BULK} at a time).</p>
        </div>
      </div>

      {needSetup && (
        <div className="mb-4 rounded-2xl border border-gold bg-gold-50 p-4 text-sm text-maroon-900">
          <b>One-time setup needed.</b> Run <code className="rounded bg-white px-1">supabase/migrations/005_question_trash.sql</code> in Supabase → SQL Editor, then refresh this page.
        </div>
      )}

      <div className="card mb-4 p-3"><input className="input" placeholder="Search deleted questions…" value={q} onChange={(e) => setQ(e.target.value)} /></div>

      {msg && <p className="mb-3 rounded-xl bg-gold-50 p-3 text-sm text-maroon-900">{msg}</p>}

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-maroon-50/60 p-2.5 text-sm">
        {selected.size > 0 ? (
          <>
            <b className="px-1 text-maroon">{selected.size} selected</b>
            <button disabled={busy} onClick={() => restore([...selected])} className="btn-primary !py-1.5">↩ Restore selected</button>
            <button disabled={busy} onClick={() => { setPurge([...selected]); setConfirmText(""); }} className="btn !py-1.5 bg-red-600 text-white hover:bg-red-700">Delete permanently</button>
            <button onClick={() => setSelected(new Set())} className="px-2 text-stone-500 hover:text-maroon">Clear selection</button>
          </>
        ) : <span className="px-1 text-stone-500">Tick questions (or the top box to select this page, up to {MAX_BULK}) to restore or delete them permanently.</span>}
      </div>

      {purge && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => !busy && setPurge(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="h-display text-xl text-red-700">Permanently delete {purge.length} question{purge.length === 1 ? "" : "s"}?</h2>
            <p className="mt-2 text-sm text-stone-600">This <b>cannot be undone</b>. Students&apos; answers, bookmarks and mistake-notebook entries for these questions are removed too.</p>
            <label className="label mt-4" htmlFor="confirm-purge">Type <b>DELETE</b> to confirm</label>
            <input id="confirm-purge" className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus />
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-outline" disabled={busy} onClick={() => setPurge(null)}>Cancel</button>
              <button className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50" disabled={busy || confirmText.trim().toUpperCase() !== "DELETE"} onClick={runPurge}>{busy ? "Deleting…" : "Delete permanently"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-maroon-50/60 text-left text-xs uppercase text-stone-500">
              <tr><th className="w-10 pl-4"><input type="checkbox" aria-label="Select all on this page" className="h-4 w-4 accent-maroon" checked={allOnPage} onChange={togglePage} /></th><th className="px-2 py-2.5">Question</th><th className="px-2">Subject</th><th className="px-2">Exam</th><th className="px-2">Deleted on</th><th className="px-4 text-right">Actions</th></tr>
            </thead>
            <tbody className={loading ? "opacity-50" : ""}>
              {rows.map((r) => (
                <tr key={r.id} className={`border-t border-maroon/5 align-top ${selected.has(r.id) ? "bg-gold-50/70" : ""}`}>
                  <td className="pl-4 pt-3"><input type="checkbox" aria-label="Select question" className="h-4 w-4 accent-maroon" checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
                  <td className="max-w-md px-2 py-2.5">{stripHtml(r.question_en || r.question_hi, 130)}</td>
                  <td className="px-2 py-2.5">{subjectName(r.subject_id)}</td>
                  <td className="px-2 py-2.5 text-stone-600">{taxonomy.exams.find((x) => x.id === r.exam_id)?.short_name ?? r.year ?? "—"}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-stone-600">{fmt(r.deleted_at)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button disabled={busy} onClick={() => restore([r.id])} className="whitespace-nowrap rounded-md border border-maroon/15 px-2 py-1 text-xs text-maroon hover:bg-maroon-50">↩ Restore</button>
                      <button disabled={busy} onClick={() => { setPurge([r.id]); setConfirmText(""); }} className="whitespace-nowrap rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50">Delete permanently</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-stone-500">The Deleted folder is empty.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-maroon/10 px-4 py-3 text-sm">
          <span className="text-stone-500">{total ? `${page * MAX_BULK + 1}–${Math.min(total, (page + 1) * MAX_BULK)} of ${total}` : "0"}</span>
          <div className="flex gap-2">
            <button className="btn-outline !py-1.5" disabled={page === 0} onClick={() => setPage(page - 1)}>← Prev</button>
            <button className="btn-outline !py-1.5" disabled={(page + 1) * MAX_BULK >= total} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

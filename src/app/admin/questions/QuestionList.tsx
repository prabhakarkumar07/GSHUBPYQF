"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/providers";
import { getSupabase } from "@/lib/supabase/client";
import { stripHtml } from "@/lib/html";
import type { Question } from "@/lib/types";
import { IconEdit, IconTrash } from "@/components/icons";

const PAGE = 25;
/** Most questions that can be deleted / restored in one action. */
export const MAX_BULK = 300;
export const isTrashSetupError = (m: string | undefined | null) => !!m && /deleted_at|test_id|admin_trash_questions|admin_restore_questions|admin_purge_questions/i.test(m);

export function QuestionList() {
  const { taxonomy, subjectName, topicName } = useApp();
  const [rows, setRows] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [subject, setSubject] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [exam, setExam] = useState<string>("");
  const [status, setStatus] = useState<"all" | "live" | "dropped">("all");
  const [source, setSource] = useState<string>("");
  const [q, setQ] = useState("");
  const [year, setYear] = useState("");
  const [added, setAdded] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<null | "selected" | "filter">(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [needSetup, setNeedSetup] = useState(false);
  const [trashCount, setTrashCount] = useState<number | null>(null);

  // Same filters are used for the list and for "delete all matching".
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyFilters = useCallback(<T extends { eq: any; or: any; gte: any; lt: any; is: any }>(query: T): T => {
    let x = query.is("deleted_at", null).is("test_id", null);
    if (subject) x = x.eq("subject_id", Number(subject));
    if (topic) x = x.eq("topic_id", Number(topic));
    if (exam) x = x.eq("exam_id", Number(exam));
    if (year) x = x.eq("year", Number(year));
    if (status !== "all") x = x.eq("is_dropped", status === "dropped");
    if (source) x = x.eq("source", source);
    if (added) {
      const start = new Date(`${added}T00:00:00`); const end = new Date(start.getTime() + 86400000);
      x = x.gte("created_at", start.toISOString()).lt("created_at", end.toISOString());
    }
    const term = q.trim().replace(/[%,()]/g, " ");
    if (term) x = x.or(`question_en.ilike.%${term}%,question_hi.ilike.%${term}%`);
    return x;
  }, [subject, topic, exam, year, status, source, added, q]);

  const filtersOn = !!(subject || topic || exam || year || status !== "all" || source || added || q.trim());

  const load = useCallback(async () => {
    setLoading(true);
    const query = applyFilters(getSupabase().from("questions").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1));
    const { data, count, error } = await query;
    if (isTrashSetupError(error?.message)) setNeedSetup(true);
    setRows((data as Question[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
    const t = await getSupabase().from("questions").select("id", { count: "exact", head: true }).not("deleted_at", "is", null);
    setTrashCount(t.error ? null : t.count ?? 0);
  }, [page, applyFilters]);

  /** Moves up to MAX_BULK questions to the Deleted folder. */
  const moveToTrash = async (ids: string[]) => {
    const { data, error } = await getSupabase().rpc("admin_trash_questions", { p_ids: ids.slice(0, MAX_BULK) });
    if (error) { if (isTrashSetupError(error.message)) setNeedSetup(true); throw new Error(error.message); }
    return Number(data ?? 0);
  };

  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); }, [load]);
  useEffect(() => { setPage(0); setSelected(new Set()); }, [applyFilters]);

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const togglePage = () => setSelected((s) => { const n = new Set(s); rows.forEach((r) => (allOnPage ? n.delete(r.id) : n.add(r.id))); return n; });

  const inChunks = async (ids: string[], fn: (chunk: string[]) => PromiseLike<{ error: { message: string } | null }>) => {
    for (let i = 0; i < ids.length; i += 200) { const { error } = await fn(ids.slice(i, i + 200)); if (error) throw new Error(error.message); }
  };

  const setDroppedSelected = async (dropped: boolean) => {
    setBusy(true); setMsg(null);
    try {
      await inChunks([...selected], (c) => getSupabase().from("questions").update({ is_dropped: dropped }).in("id", c));
      setMsg(`${selected.size} question(s) ${dropped ? "marked dropped" : "restored"}.`); setSelected(new Set()); load();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };

  const runBulkDelete = async () => {
    setBusy(true); setMsg(null);
    try {
      let n = 0;
      if (bulk === "selected") {
        if (selected.size > MAX_BULK) throw new Error(`You can delete at most ${MAX_BULK} questions at a time. ${selected.size} are selected.`);
        n = await moveToTrash([...selected]);
      } else {
        const { data, error } = await applyFilters(getSupabase().from("questions").select("id").order("created_at", { ascending: false }).order("id")).range(0, MAX_BULK - 1);
        if (error) throw new Error(error.message);
        n = await moveToTrash(((data ?? []) as { id: string }[]).map((r) => r.id));
      }
      setMsg(`${n} question(s) moved to the Deleted folder. You can restore them from there.${bulk === "filter" && total - n > 0 ? ` ${total - n} more match the filter — click again to delete the next ${Math.min(MAX_BULK, total - n)}.` : ""}`); setSelected(new Set()); setBulk(null); setPage(0); load();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };
  // ---- duplicates: same exam + same question text + same options + same answer; keep the oldest copy
  const [dupes, setDupes] = useState<{ ids: string[]; groups: number; scanned: number } | null>(null);
  const findDuplicates = async () => {
    setBusy(true); setMsg(null);
    try {
      const all: { id: string; exam_id: number | null; question_en: string | null; question_hi: string | null; options: unknown; correct_option: string; created_at: string }[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await applyFilters(getSupabase().from("questions").select("id, exam_id, question_en, question_hi, options, correct_option, created_at").order("created_at", { ascending: true }).order("id", { ascending: true }).range(from, from + 999));
        if (error) throw new Error(error.message);
        all.push(...((data ?? []) as typeof all));
        if (!data || data.length < 1000) break;
      }
      const clean = (v: unknown) => String(v ?? "").toLowerCase().replace(/<[^>]+>/g, "").replace(/&nbsp;/g, "").replace(/\s+/g, "");
      const seen = new Map<string, number>();
      const ids: string[] = [];
      for (const r of all) {
        const key = [r.exam_id ?? "", clean(r.question_en) + clean(r.question_hi), clean(JSON.stringify(r.options)), r.correct_option].join("|");
        const n = seen.get(key) ?? 0;
        if (n > 0) ids.push(r.id);
        seen.set(key, n + 1);
      }
      const groups = [...seen.values()].filter((n) => n > 1).length;
      if (!ids.length) setMsg(`No duplicates found among ${all.length} question(s).`);
      else { setDupes({ ids, groups, scanned: all.length }); }
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };
  const removeDuplicates = async () => {
    if (!dupes) return;
    setBusy(true); setMsg(null);
    try {
      const n = await moveToTrash(dupes.ids);
      const left = dupes.ids.length - n;
      setMsg(`${n} duplicate copies moved to the Deleted folder. One copy of each question was kept.${left > 0 ? ` ${left} more duplicates remain — click "Remove duplicates" again.` : ""}`);
      setDupes(null); setSelected(new Set()); setPage(0); load();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };

  const bulkCount = bulk === "selected" ? selected.size : Math.min(total, MAX_BULK);
  const years = [...new Set(taxonomy.exams.map((x) => x.year).filter(Boolean) as number[])];
  for (let y = new Date().getFullYear(); y >= 1990; y--) if (!years.includes(y)) years.push(y);
  years.sort((a, b) => b - a);

  const toggleDropped = async (row: Question) => {
    await getSupabase().from("questions").update({ is_dropped: !row.is_dropped }).eq("id", row.id);
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, is_dropped: !r.is_dropped } : r)));
  };
  const remove = async (row: Question) => {
    if (!confirm("Move this question to the Deleted folder? You can restore it from there.")) return;
    try { await moveToTrash([row.id]); setMsg("1 question moved to the Deleted folder."); load(); } catch (e) { alert((e as Error).message); }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="h-display text-2xl">Questions <span className="text-base font-normal text-stone-500">({total})</span></h1>
        <div className="flex flex-wrap gap-2"><Link href="/admin/questions/trash" className="btn-outline">🗑 Deleted{trashCount !== null ? ` (${trashCount})` : ""}</Link><Link href="/admin/upload" className="btn-outline">Bulk upload</Link><Link href="/admin/questions/new" className="btn-primary">+ Add question</Link></div>
      </div>
      {needSetup && (
        <div className="mb-4 rounded-2xl border border-gold bg-gold-50 p-4 text-sm text-maroon-900">
          <b>One-time setup needed.</b> Run <code className="rounded bg-white px-1">supabase/migrations/005_question_trash.sql</code> and then <code className="rounded bg-white px-1">006_tests.sql</code> in Supabase → SQL Editor, then refresh this page.
        </div>
      )}
      <div className="card mb-4 grid gap-2 p-3 sm:grid-cols-3 lg:grid-cols-6">
        <input className="input lg:col-span-2" placeholder="Search question text…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={subject} onChange={(e) => { setSubject(e.target.value); setTopic(""); }}>
          <option value="">All subjects</option>{taxonomy.subjects.map((s) => <option key={s.id} value={s.id}>{s.name_en}</option>)}
        </select>
        <select className="input" value={topic} onChange={(e) => setTopic(e.target.value)} disabled={!subject}>
          <option value="">All topics</option>{taxonomy.topics.filter((t) => String(t.subject_id) === subject).map((t) => <option key={t.id} value={t.id}>{t.name_en}</option>)}
        </select>
        <select className="input" value={exam} onChange={(e) => setExam(e.target.value)}>
          <option value="">All exams</option>{taxonomy.exams.map((x) => <option key={x.id} value={x.id}>{x.short_name}</option>)}
        </select>
        <select className="input" value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">All years</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-stone-600 lg:col-span-2"><span className="shrink-0">Added on</span><input type="date" className="input" value={added} onChange={(e) => setAdded(e.target.value)} /></label>
        <div className="flex gap-2 lg:col-span-2">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="all">Any status</option><option value="live">Live</option><option value="dropped">Dropped</option>
          </select>
          <select className="input" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">Any source</option><option value="pyq">PYQ</option><option value="sample">Sample</option><option value="current_affairs">CA</option><option value="test_series">Test series</option>
          </select>
        </div>
        {filtersOn && <button onClick={() => { setQ(""); setSubject(""); setTopic(""); setExam(""); setYear(""); setStatus("all"); setSource(""); setAdded(""); }} className="text-left text-sm font-semibold text-maroon hover:underline sm:col-span-3 lg:col-span-6">✕ Clear all filters</button>}
      </div>

      {msg && <p className="mb-3 rounded-xl bg-gold-50 p-3 text-sm text-maroon-900">{msg}</p>}

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-maroon-50/60 p-2.5 text-sm">
        {selected.size > 0 ? (
          <>
            <b className="px-1 text-maroon">{selected.size} selected</b>
            <button disabled={busy} onClick={() => setDroppedSelected(true)} className="btn-outline !py-1.5">Mark dropped</button>
            <button disabled={busy} onClick={() => setDroppedSelected(false)} className="btn-outline !py-1.5">Restore</button>
            <button disabled={busy || selected.size > MAX_BULK} title={selected.size > MAX_BULK ? `Max ${MAX_BULK} at a time` : ""} onClick={() => () => setBulk("selected")} className="btn !py-1.5 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">🗑 Delete selected</button>
            {selected.size > MAX_BULK && <span className="text-xs font-semibold text-red-700">Max {MAX_BULK} at a time</span>}
            <button onClick={() => setSelected(new Set())} className="px-2 text-stone-500 hover:text-maroon">Clear selection</button>
          </>
        ) : <span className="px-1 text-stone-500">Tick questions, or use a filter. Deleted questions go to the 🗑 Deleted folder (max {MAX_BULK} at a time).</span>}
        <button disabled={busy || total === 0} onClick={findDuplicates} className="btn-outline !py-1.5 ml-auto">{busy && !bulk && !dupes ? "Checking…" : "🔍 Remove duplicates"}</button>
        <button disabled={busy || total === 0} onClick={() => { setBulk("filter"); }} className="btn !py-1.5 border border-red-300 bg-white text-red-700 hover:bg-red-50">
          🗑 {total > MAX_BULK ? `Delete ${MAX_BULK} of ${total.toLocaleString("en-IN")}` : `Delete all ${total.toLocaleString("en-IN")}`} {filtersOn ? "matching filter" : "questions"}
        </button>
      </div>

      {bulk && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => !busy && setBulk(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="h-display text-xl text-red-700">Delete {bulkCount.toLocaleString("en-IN")} question{bulkCount === 1 ? "" : "s"}?</h2>
            <p className="mt-2 text-sm text-stone-600">
              {bulk === "filter"
                ? (total > MAX_BULK
                    ? `${total.toLocaleString("en-IN")} questions match${filtersOn ? " the filters" : " (no filter — ALL questions)"}. Only ${MAX_BULK} can be deleted at a time — the newest ${MAX_BULK} will be deleted now.`
                    : (filtersOn ? "Every question matching the current filters will be deleted, not just this page." : "No filter is applied — this deletes ALL questions in the portal."))
                : "Only the questions you ticked will be deleted."}
              {" "}They go to the <b>🗑 Deleted</b> folder and are hidden from students. You can restore them from there, or delete them permanently.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-outline" disabled={busy} onClick={() => setBulk(null)}>Cancel</button>
              <button className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50" disabled={busy} onClick={runBulkDelete}>{busy ? "Deleting…" : "Move to Deleted"}</button>
            </div>
          </div>
        </div>
      )}

      {dupes && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => !busy && setDupes(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="h-display text-xl text-maroon">{dupes.ids.length.toLocaleString("en-IN")} duplicate cop{dupes.ids.length === 1 ? "y" : "ies"} found</h2>
            <p className="mt-2 text-sm text-stone-600">
              Checked {dupes.scanned.toLocaleString("en-IN")} question(s){filtersOn ? " matching the current filters" : ""}. {dupes.groups.toLocaleString("en-IN")} question(s) appear more than once (same exam, same question, same options and answer).
              The <b>first uploaded copy of each is kept</b>; the extra copies go to the 🗑 Deleted folder.
              {dupes.ids.length > MAX_BULK && <> Only {MAX_BULK} can be deleted at a time — click &quot;Remove duplicates&quot; again for the rest.</>}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-outline" disabled={busy} onClick={() => setDupes(null)}>Cancel</button>
              <button className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50" disabled={busy} onClick={removeDuplicates}>{busy ? "Deleting…" : `Delete ${Math.min(dupes.ids.length, MAX_BULK)} duplicates`}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-maroon-50/60 text-left text-xs uppercase text-stone-500">
              <tr><th className="w-10 pl-4"><input type="checkbox" aria-label="Select all on this page" className="h-4 w-4 accent-maroon" checked={allOnPage} onChange={togglePage} /></th><th className="px-2 py-2.5">Question</th><th className="px-2">Subject / topic</th><th className="px-2">Exam</th><th className="px-2 text-center">Ans</th><th className="px-2">Status</th><th className="px-4 text-right">Actions</th></tr>
            </thead>
            <tbody className={loading ? "opacity-50" : ""}>
              {rows.map((r) => (
                <tr key={r.id} className={`border-t border-maroon/5 align-top ${selected.has(r.id) ? "bg-gold-50/70" : ""}`}>
                  <td className="pl-4 pt-3"><input type="checkbox" aria-label="Select question" className="h-4 w-4 accent-maroon" checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
                  <td className="max-w-md px-2 py-2.5">
                    <Link href={`/admin/questions/${r.id}`} className="hover:text-maroon">{stripHtml(r.question_en, 130)}</Link>
                    {!r.question_hi && <div className="mt-0.5 text-xs text-amber-700">Hindi missing</div>}
                  </td>
                  <td className="px-2 py-2.5"><div>{subjectName(r.subject_id)}</div><div className="text-xs text-stone-500">{r.topic_id ? topicName(r.topic_id) : "—"}</div></td>
                  <td className="px-2 py-2.5 text-stone-600">{taxonomy.exams.find((x) => x.id === r.exam_id)?.short_name ?? r.year ?? "—"}</td>
                  <td className="px-2 py-2.5 text-center font-bold text-green-700">{r.correct_option}</td>
                  <td className="px-2 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {r.is_dropped ? <span className="badge bg-red-100 text-red-800">Dropped</span> : <span className="badge bg-green-100 text-green-800">Live</span>}
                      {r.is_high_priority && <span className="badge bg-gold text-maroon-900">★</span>}
                      {r.source !== "pyq" && <span className="badge bg-stone-100 text-stone-600">{r.source}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => toggleDropped(r)} className="whitespace-nowrap rounded-md border border-maroon/15 px-2 py-1 text-xs hover:bg-maroon-50">{r.is_dropped ? "Restore" : "Mark dropped"}</button>
                      <Link href={`/admin/questions/${r.id}`} className="rounded-md border border-maroon/15 p-1 text-maroon hover:bg-maroon-50" title="Edit"><IconEdit className="h-4 w-4" /></Link>
                      <button onClick={() => remove(r)} className="rounded-md border border-maroon/15 p-1 text-red-700 hover:bg-red-50" title="Delete"><IconTrash className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-stone-500">No questions match.</td></tr>}
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
    </div>
  );
}

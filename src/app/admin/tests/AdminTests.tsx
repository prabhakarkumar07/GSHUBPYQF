"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";
import { TEST_CATEGORIES, monthLabel, type TestCategory } from "@/lib/test-meta";

interface Row {
  id: string; category: TestCategory; title_en: string; is_published: boolean; month: string | null; duration_min: number;
  positive_marks: number; negative_marks: number; question_limit: number | null; uploaded: number; live: number; attempts: number; created_at: string;
}

export function AdminTests() {
  const router = useRouter();
  const [tab, setTab] = useState<TestCategory>("pyq_full");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase().rpc("admin_list_tests");
    if (error) setError(error.message); else setRows((data as Row[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 2) return;
    setBusy(true);
    const isMonthly = tab === "monthly";
    const now = new Date();
    const { data, error } = await getSupabase().from("tests").insert({
      category: tab, title_en: title.trim(),
      month: isMonthly ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01` : null,
      duration_min: isMonthly ? 60 : 120, positive_marks: 1, negative_marks: isMonthly ? 0.25 : 0.33,
    }).select("id").single();
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.push(`/admin/tests/${data.id}`);
  };

  if (error && /admin_list_tests|tests|function/i.test(error) && rows === null) {
    return (
      <div className="card p-6">
        <h1 className="h-display text-xl">One-time setup needed</h1>
        <p className="mt-2 text-sm text-stone-600">Run <code className="rounded bg-maroon-50 px-1">supabase/migrations/006_tests.sql</code> in Supabase → SQL Editor (after 005), then refresh this page.</p>
        <p className="mt-2 text-xs text-stone-400">{error}</p>
      </div>
    );
  }

  const list = (rows ?? []).filter((r) => r.category === tab);
  const meta = TEST_CATEGORIES[tab];

  return (
    <div>
      <div className="mb-4">
        <h1 className="h-display text-2xl">Tests</h1>
        <p className="mt-1 text-sm text-stone-600">Create a test, set its marking, time and number of questions, then upload its questions. These questions are separate from the topic-wise practice bank. Published tests show on the home page.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(TEST_CATEGORIES) as TestCategory[]).map((c) => (
          <button key={c} onClick={() => setTab(c)} className={tab === c ? "chip-on" : "chip-off"}>
            {TEST_CATEGORIES[c].icon} {TEST_CATEGORIES[c].en} · {(rows ?? []).filter((r) => r.category === c).length}
          </button>
        ))}
      </div>

      <form onSubmit={create} className="card mb-4 flex flex-wrap items-end gap-2 p-4">
        <div className="min-w-[240px] flex-1">
          <label className="label" htmlFor="new-title">New {meta.en.replace(/s$/, "")} — title</label>
          <input id="new-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder={tab === "monthly" ? "e.g. October 2026 Current Affairs MCQ" : "e.g. 70th BPSC Prelims 2024 — Full Paper"} />
        </div>
        <button className="btn-primary" disabled={busy || title.trim().length < 2}>{busy ? "Creating…" : "+ Create test"}</button>
      </form>

      {error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {rows === null ? <Spinner /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-maroon-50/60 text-left text-xs uppercase text-stone-500">
                <tr><th className="px-4 py-2.5">Test</th><th className="px-2 text-right">Questions</th><th className="px-2 text-right">Time</th><th className="px-2 text-center">Marking</th><th className="px-2 text-right">Attempts</th><th className="px-2">Status</th><th className="px-4"></th></tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const used = r.question_limit ? Math.min(r.question_limit, r.live) : r.live;
                  return (
                    <tr key={r.id} className="border-t border-maroon/5 hover:bg-maroon-50/30">
                      <td className="px-4 py-2.5"><Link href={`/admin/tests/${r.id}`} className="font-medium text-maroon hover:underline">{r.title_en}</Link>{r.month && <div className="text-xs text-stone-500">{monthLabel(r.month, "en")}</div>}</td>
                      <td className="px-2 text-right tabular-nums">{used}{r.question_limit ? <span className="text-xs text-stone-500"> / {r.question_limit}</span> : null}{r.uploaded !== used && <div className="text-xs text-stone-500">{r.uploaded} uploaded</div>}</td>
                      <td className="px-2 text-right tabular-nums">{r.duration_min} min</td>
                      <td className="px-2 text-center tabular-nums">+{Number(r.positive_marks)} / −{Number(r.negative_marks)}</td>
                      <td className="px-2 text-right tabular-nums">{r.attempts}</td>
                      <td className="px-2">{r.is_published ? <span className="badge bg-green-100 text-green-800">Published</span> : <span className="badge bg-stone-100 text-stone-600">Draft</span>}</td>
                      <td className="px-4 text-right"><Link href={`/admin/tests/${r.id}`} className="rounded-md border border-maroon/15 px-2 py-1 text-xs text-maroon hover:bg-maroon-50">Manage →</Link></td>
                    </tr>
                  );
                })}
                {list.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-stone-500">No {meta.en.toLowerCase()} yet. Create one above.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { Spinner, Stat } from "@/components/ui";

interface Data {
  total_users: number; new_users_7d: number; live_questions: number; dropped_questions: number;
  quizzes_submitted: number; answers_recorded: number; dau_today: number; feedback_count: number;
  dau_series: { day: string; users: number }[];
  most_missed: { id: string; question: string; subject: string; attempts: number; correct_pct: number }[];
}

export function Analytics() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    getSupabase().rpc("admin_analytics").then(({ data, error }) => (error ? setErr(error.message) : setD(data as Data)));
  }, []);
  if (err) return <p className="rounded-xl bg-red-50 p-4 text-red-800">{err}</p>;
  if (!d) return <Spinner />;
  const max = Math.max(1, ...d.dau_series.map((x) => x.users));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat accent label="Total users" value={d.total_users.toLocaleString("en-IN")} hint={`+${d.new_users_7d} in last 7 days`} />
        <Stat label="Active today" value={d.dau_today} hint="students who practised today (IST)" />
        <Stat label="Live questions" value={d.live_questions.toLocaleString("en-IN")} hint={`${d.dropped_questions} dropped`} />
        <Stat label="Quizzes submitted" value={d.quizzes_submitted.toLocaleString("en-IN")} hint={`${d.answers_recorded.toLocaleString("en-IN")} answers`} />
      </div>

      <section className="card p-5">
        <h2 className="mb-4 font-bold text-maroon">Daily active users — last 14 days</h2>
        <div className="flex h-40 items-end gap-1.5">
          {d.dau_series.map((x) => (
            <div key={x.day} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] tabular-nums text-stone-500">{x.users || ""}</span>
              <div className="w-full rounded-t bg-maroon" style={{ height: `${(100 * x.users) / max}%`, minHeight: x.users ? 4 : 1, opacity: x.users ? 1 : 0.15 }} title={`${x.day}: ${x.users}`} />
              <span className="text-[10px] text-stone-500">{new Date(x.day).getDate()}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-maroon/10 px-5 py-3">
          <h2 className="font-bold text-maroon">Most-missed questions</h2>
          <span className="text-xs text-stone-500">first attempts by each student; min attempts set in Settings</span>
        </div>
        {d.most_missed.length === 0 ? (
          <p className="p-5 text-sm text-stone-500">Not enough attempts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-maroon-50/60 text-left text-xs uppercase text-stone-500"><tr><th className="px-5 py-2">Question</th><th className="px-3">Subject</th><th className="px-3 text-right">Attempts</th><th className="px-5 text-right">Correct</th></tr></thead>
              <tbody>
                {d.most_missed.map((m) => (
                  <tr key={m.id} className="border-t border-maroon/5">
                    <td className="px-5 py-2.5"><Link href={`/admin/questions/${m.id}`} className="hover:text-maroon hover:underline">{m.question}</Link></td>
                    <td className="px-3 text-stone-600">{m.subject}</td>
                    <td className="px-3 text-right tabular-nums">{m.attempts}</td>
                    <td className={`px-5 text-right font-semibold tabular-nums ${m.correct_pct < 40 ? "text-red-700" : m.correct_pct < 70 ? "text-amber-700" : "text-green-700"}`}>{m.correct_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="text-sm text-stone-500">{d.feedback_count} feedback messages — <Link href="/admin/feedback" className="text-maroon underline">read them</Link>.</p>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";
import { Spinner } from "@/components/ui";
import { IconTrophy } from "@/components/icons";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<any[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchApi("/user/leaderboard", {}, null);
        setLeaderboard(res.leaderboard || []);
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
        setLeaderboard([]);
      }
    })();
  }, []);

  return (
    <main className="container-page py-8 sm:py-10">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/40 bg-gold-50 text-maroon shadow-sm">
          <IconTrophy className="h-7 w-7" />
        </div>
        <h1 className="h-display mb-2 text-3xl text-maroon sm:text-4xl">
          Global Leaderboard
        </h1>
        <p className="text-sm text-stone-600 sm:text-base">Compete with thousands of aspirants across India.</p>
      </div>

      <div className="mx-auto max-w-3xl">
        {!leaderboard ? (
          <Spinner label="Loading Leaderboard..." />
        ) : (
          <div className="card overflow-hidden">
            <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-maroon/10 bg-maroon px-4 py-3 text-xs font-bold uppercase tracking-wide text-white/75 sm:px-6">
              <span>Rank</span>
              <span>Aspirant</span>
              <span className="text-right">Score</span>
            </div>
            <ul className="divide-y divide-maroon/10">
              {leaderboard.length === 0 && (
                <li className="p-6 text-center text-stone-500">No scores recorded yet.</li>
              )}
              {leaderboard.map((user: any, idx: number) => (
                <li key={user.id ?? idx} className={`grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 transition-colors hover:bg-maroon-50/40 sm:px-6 ${idx < 3 ? "bg-gold-50/40" : "bg-white"}`}>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold tabular-nums ${
                    idx === 0 ? "bg-yellow-400 text-yellow-900 shadow-md" :
                    idx === 1 ? "bg-slate-300 text-slate-800 shadow-md" :
                    idx === 2 ? "bg-orange-400 text-orange-950 shadow-md" :
                    "bg-stone-100 text-stone-500"
                  }`}>
                    {idx + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-ink">{user.full_name || "Anonymous User"}</div>
                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-stone-500">
                      <span>{user.quizzes_taken || 0} quizzes taken</span>
                      <span aria-hidden="true">&middot;</span>
                      <span>{Math.round(((user.correct_answers || 0) / Math.max(1, user.total_answers || 1)) * 100)}% accuracy</span>
                    </div>
                  </div>

                  <div className="min-w-[4.5rem] text-right">
                    <div className="font-display text-lg font-bold tabular-nums text-maroon sm:text-xl">{Math.round(user.total_score || 0)}</div>
                    <div className="text-[10px] uppercase tracking-wider text-stone-400">Score</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}

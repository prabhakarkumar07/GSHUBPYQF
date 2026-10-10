"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/components/providers";
import { getSupabase } from "@/lib/supabase/client";

export function SettingsForm() {
  const { taxonomy, reloadTaxonomy } = useApp();
  const [v, setV] = useState(taxonomy.settings);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { setV(taxonomy.settings); }, [taxonomy.settings]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await getSupabase().from("app_settings").update({ ...v, updated_at: new Date().toISOString() }).eq("id", 1);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Saved ✓ — applies to quizzes started from now on." });
    if (!error) reloadTaxonomy();
  };

  return (
    <form onSubmit={save} className="card max-w-xl space-y-4 p-5">
      <h1 className="h-display text-2xl">Marking & settings</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="label">Marks for a correct answer</span><input className="input" type="number" step="0.01" min="0" value={v.positive_marks} onChange={(e) => setV({ ...v, positive_marks: Number(e.target.value) })} /></label>
        <label><span className="label">Negative marks for a wrong answer</span><input className="input" type="number" step="0.01" min="0" value={v.negative_marks} onChange={(e) => setV({ ...v, negative_marks: Number(e.target.value) })} /></label>
        <label><span className="label">Exam-mode seconds per question</span><input className="input" type="number" min="10" value={v.seconds_per_question} onChange={(e) => setV({ ...v, seconds_per_question: Number(e.target.value) })} /><span className="mt-1 block text-xs text-stone-500">BPSC: 150 questions in 2 hours = 48 s</span></label>
        <label><span className="label">Min. students before showing “% solved”</span><input className="input" type="number" min="1" value={v.min_stats_attempts} onChange={(e) => setV({ ...v, min_stats_attempts: Number(e.target.value) })} /><span className="mt-1 block text-xs text-stone-500">Set to 1 while testing</span></label>
      </div>
      <p className="rounded-xl bg-gold-50 p-3 text-sm text-maroon-900">Default BPSC scheme: +1 / −0.33. Each quiz stores the marking that was active when it started, so past results never change.</p>
      <button className="btn-primary">Save settings</button>
      {msg && <p className={`rounded-lg p-2 text-sm ${msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{msg.text}</p>}
    </form>
  );
}

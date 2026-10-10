"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";
import { IconTrash } from "@/components/icons";

interface Row { id: number; kind: string; page: string | null; message: string; contact: string | null; created_at: string; user_id: string | null }

export function FeedbackList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [kind, setKind] = useState<string>("");
  useEffect(() => {
    getSupabase().from("feedback").select("*").order("created_at", { ascending: false }).limit(300).then(({ data }) => setRows((data as Row[]) ?? []));
  }, []);
  if (!rows) return <Spinner />;
  const shown = rows.filter((r) => !kind || r.kind === kind);
  const remove = async (id: number) => {
    await getSupabase().from("feedback").delete().eq("id", id);
    setRows((rs) => (rs ?? []).filter((r) => r.id !== id));
  };
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="h-display text-2xl">Feedback <span className="text-base font-normal text-stone-500">({rows.length})</span></h1>
        <div className="flex gap-1.5">
          {["", "feedback", "feature", "bug"].map((k) => <button key={k} onClick={() => setKind(k)} className={kind === k ? "chip-on !py-1" : "chip-off !py-1"}>{k || "All"}</button>)}
        </div>
      </div>
      <ul className="space-y-2">
        {shown.map((r) => (
          <li key={r.id} className="card flex gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <span className={`badge ${r.kind === "bug" ? "bg-red-100 text-red-800" : r.kind === "feature" ? "bg-gold-100 text-gold-700" : "bg-maroon-50 text-maroon"}`}>{r.kind}</span>
                <span>{new Date(r.created_at).toLocaleString("en-IN")}</span>
                {r.page && <span>· {r.page}</span>}
                {r.contact && <span>· {r.contact}</span>}
                {!r.user_id && <span>· guest</span>}
              </div>
              <p className="whitespace-pre-wrap text-[15px]">{r.message}</p>
            </div>
            <button onClick={() => remove(r.id)} className="self-start rounded-md p-1 text-stone-400 hover:text-red-700" title="Delete"><IconTrash className="h-4 w-4" /></button>
          </li>
        ))}
        {shown.length === 0 && <li className="card p-8 text-center text-stone-500">No feedback yet.</li>}
      </ul>
    </div>
  );
}

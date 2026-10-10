"use client";
import { useState } from "react";
import { useApp } from "@/components/providers";
import { getSupabase } from "@/lib/supabase/client";
import type { Exam, Subject, Topic } from "@/lib/types";
import { IconTrash } from "@/components/icons";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function TaxonomyEditor() {
  const { taxonomy, reloadTaxonomy } = useApp();
  const [active, setActive] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const sb = getSupabase();

  const run = async (p: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await p;
    setMsg(error ? error.message : null);
    if (!error) await reloadTaxonomy();
    return !error;
  };

  const subject = taxonomy.subjects.find((s) => s.id === active) ?? taxonomy.subjects[0];

  return (
    <div className="space-y-6">
      {msg && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{msg}</p>}
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Subjects */}
        <section className="card p-4">
          <h2 className="mb-3 font-bold text-maroon">Subjects</h2>
          <ul className="space-y-1.5">
            {taxonomy.subjects.map((s) => (
              <li key={s.id}>
                <button onClick={() => setActive(s.id)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${subject?.id === s.id ? "bg-maroon text-white" : "hover:bg-maroon-50"}`}>
                  <span>{s.icon}</span><span className="flex-1">{s.name_en}</span>
                  <span className="text-xs opacity-70">{taxonomy.topics.filter((t) => t.subject_id === s.id).length}</span>
                </button>
              </li>
            ))}
          </ul>
          <AddSubject onAdd={(v) => run(sb.from("subjects").insert({ ...v, slug: slugify(v.name_en), sort_order: taxonomy.subjects.length + 1 }))} />
        </section>

        {/* Selected subject & topics */}
        {subject && (
          <section className="card p-4">
            <SubjectEditor key={subject.id} s={subject}
              onSave={(v) => run(sb.from("subjects").update(v).eq("id", subject.id))}
              onDelete={async () => { if (confirm(`Delete subject “${subject.name_en}”? Only possible if it has no questions.`)) { if (await run(sb.from("subjects").delete().eq("id", subject.id))) setActive(null); } }} />
            <h3 className="mb-2 mt-6 font-bold text-maroon">Topics</h3>
            <ul className="space-y-2">
              {taxonomy.topics.filter((t) => t.subject_id === subject.id).map((t) => (
                <TopicRow key={t.id} t={t}
                  onSave={(v) => run(sb.from("topics").update(v).eq("id", t.id))}
                  onDelete={() => confirm(`Delete topic “${t.name_en}”? Its questions keep their subject but lose the topic.`) && run(sb.from("topics").delete().eq("id", t.id))} />
              ))}
            </ul>
            <AddTopic onAdd={(v) => run(sb.from("topics").insert({ ...v, subject_id: subject.id, slug: slugify(v.name_en), sort_order: 999 }))} />
          </section>
        )}
      </div>

      {/* Exams */}
      <section className="card p-4">
        <h2 className="mb-1 font-bold text-maroon">Exams / years</h2>
        <p className="mb-3 text-xs text-stone-500">Shown as the year filter in the quiz builder. Category lets the same system power Current Affairs quizzes and a Prelims Test Series later.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase text-stone-500"><tr><th className="py-2">Short</th><th>Name (English)</th><th>Name (Hindi)</th><th>Year</th><th>Category</th><th>Order</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {taxonomy.exams.map((e) => <ExamRow key={e.id} e={e} onSave={(v) => run(sb.from("exams").update(v).eq("id", e.id))} onDelete={() => confirm(`Delete “${e.name_en}”? Questions keep their year.`) && run(sb.from("exams").delete().eq("id", e.id))} />)}
              <ExamRow e={null} onSave={(v) => run(sb.from("exams").insert(v))} />
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-stone-500">Inactive exams are hidden from students but keep their questions.</p>
      </section>
    </div>
  );
}

function SubjectEditor({ s, onSave, onDelete }: { s: Subject; onSave: (v: Partial<Subject>) => void; onDelete: () => void }) {
  const [v, setV] = useState({ name_en: s.name_en, name_hi: s.name_hi, icon: s.icon ?? "", sort_order: s.sort_order });
  return (
    <div className="grid gap-2 sm:grid-cols-[70px_1fr_1fr_80px_auto]">
      <input className="input text-center" value={v.icon} onChange={(e) => setV({ ...v, icon: e.target.value })} aria-label="Icon" />
      <input className="input" value={v.name_en} onChange={(e) => setV({ ...v, name_en: e.target.value })} aria-label="English name" />
      <input className="input font-hindi" value={v.name_hi} onChange={(e) => setV({ ...v, name_hi: e.target.value })} aria-label="Hindi name" />
      <input className="input" type="number" value={v.sort_order} onChange={(e) => setV({ ...v, sort_order: Number(e.target.value) })} aria-label="Order" />
      <div className="flex gap-1"><button className="btn-primary !py-2" onClick={() => onSave(v)}>Save</button><button className="btn-ghost !px-2 text-red-700" onClick={onDelete} title="Delete"><IconTrash className="h-4 w-4" /></button></div>
    </div>
  );
}

function TopicRow({ t, onSave, onDelete }: { t: Topic; onSave: (v: Partial<Topic>) => void; onDelete: () => void }) {
  const [v, setV] = useState({ name_en: t.name_en, name_hi: t.name_hi, sort_order: t.sort_order });
  const dirty = v.name_en !== t.name_en || v.name_hi !== t.name_hi || v.sort_order !== t.sort_order;
  return (
    <li className="grid gap-2 sm:grid-cols-[1fr_1fr_70px_auto]">
      <input className="input !py-2" value={v.name_en} onChange={(e) => setV({ ...v, name_en: e.target.value })} />
      <input className="input !py-2 font-hindi" value={v.name_hi} onChange={(e) => setV({ ...v, name_hi: e.target.value })} />
      <input className="input !py-2" type="number" value={v.sort_order} onChange={(e) => setV({ ...v, sort_order: Number(e.target.value) })} />
      <div className="flex gap-1"><button className="btn-outline !py-2" disabled={!dirty} onClick={() => onSave(v)}>Save</button><button className="btn-ghost !px-2 text-red-700" onClick={onDelete} title="Delete"><IconTrash className="h-4 w-4" /></button></div>
    </li>
  );
}

function AddTopic({ onAdd }: { onAdd: (v: { name_en: string; name_hi: string }) => Promise<boolean> }) {
  const [v, setV] = useState({ name_en: "", name_hi: "" });
  return (
    <form className="mt-3 grid gap-2 rounded-xl bg-gold-50 p-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={async (e) => { e.preventDefault(); if (v.name_en && v.name_hi && (await onAdd(v))) setV({ name_en: "", name_hi: "" }); }}>
      <input className="input !py-2" placeholder="New topic (English)" value={v.name_en} onChange={(e) => setV({ ...v, name_en: e.target.value })} />
      <input className="input !py-2 font-hindi" placeholder="नया टॉपिक (हिंदी)" value={v.name_hi} onChange={(e) => setV({ ...v, name_hi: e.target.value })} />
      <button className="btn-primary !py-2">+ Add topic</button>
    </form>
  );
}

function AddSubject({ onAdd }: { onAdd: (v: { name_en: string; name_hi: string; icon: string }) => Promise<boolean> }) {
  const [v, setV] = useState({ name_en: "", name_hi: "", icon: "📘" });
  return (
    <form className="mt-4 space-y-2 rounded-xl bg-gold-50 p-3" onSubmit={async (e) => { e.preventDefault(); if (v.name_en && v.name_hi && (await onAdd(v))) setV({ name_en: "", name_hi: "", icon: "📘" }); }}>
      <div className="flex gap-2"><input className="input !w-16 !py-2 text-center" value={v.icon} onChange={(e) => setV({ ...v, icon: e.target.value })} /><input className="input !py-2" placeholder="Subject (English)" value={v.name_en} onChange={(e) => setV({ ...v, name_en: e.target.value })} /></div>
      <input className="input !py-2 font-hindi" placeholder="विषय (हिंदी)" value={v.name_hi} onChange={(e) => setV({ ...v, name_hi: e.target.value })} />
      <button className="btn-primary w-full !py-2">+ Add subject</button>
    </form>
  );
}

function ExamRow({ e, onSave, onDelete }: { e: Exam | null; onSave: (v: Partial<Exam>) => Promise<boolean>; onDelete?: () => void }) {
  const init = { short_name: e?.short_name ?? "", name_en: e?.name_en ?? "", name_hi: e?.name_hi ?? "", year: e?.year ?? new Date().getFullYear(), category: e?.category ?? "pyq", sort_order: e?.sort_order ?? 100, is_active: e?.is_active ?? true };
  const [v, setV] = useState(init);
  return (
    <tr className={`border-t border-maroon/5 ${!e ? "bg-gold-50" : ""}`}>
      <td className="py-1.5 pr-1"><input className="input !w-24 !py-1.5" placeholder="72nd" value={v.short_name} onChange={(x) => setV({ ...v, short_name: x.target.value })} /></td>
      <td className="pr-1"><input className="input !py-1.5" placeholder="72nd BPSC Integrated Prelims" value={v.name_en} onChange={(x) => setV({ ...v, name_en: x.target.value })} /></td>
      <td className="pr-1"><input className="input !py-1.5 font-hindi" value={v.name_hi ?? ""} onChange={(x) => setV({ ...v, name_hi: x.target.value })} /></td>
      <td className="pr-1"><input className="input !w-20 !py-1.5" type="number" value={v.year ?? ""} onChange={(x) => setV({ ...v, year: Number(x.target.value) })} /></td>
      <td className="pr-1">
        <select className="input !py-1.5" value={v.category} onChange={(x) => setV({ ...v, category: x.target.value as Exam["category"] })}>
          <option value="pyq">PYQ</option><option value="current_affairs">Current Affairs</option><option value="test_series">Test Series</option><option value="other">Other</option>
        </select>
      </td>
      <td className="pr-1"><input className="input !w-16 !py-1.5" type="number" value={v.sort_order} onChange={(x) => setV({ ...v, sort_order: Number(x.target.value) })} /></td>
      <td className="pr-1 text-center"><input type="checkbox" className="h-4 w-4 accent-maroon" checked={v.is_active} onChange={(x) => setV({ ...v, is_active: x.target.checked })} /></td>
      <td className="whitespace-nowrap">
        <button className="btn-outline !px-2.5 !py-1.5 text-xs" disabled={!v.short_name || !v.name_en} onClick={async () => { if ((await onSave(v)) && !e) setV(init); }}>{e ? "Save" : "+ Add"}</button>
        {onDelete && <button className="btn-ghost !px-2 text-red-700" onClick={onDelete}><IconTrash className="h-4 w-4" /></button>}
      </td>
    </tr>
  );
}

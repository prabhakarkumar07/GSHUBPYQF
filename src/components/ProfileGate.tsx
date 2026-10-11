"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "./providers";
import { ProfileFields } from "./ProfileFields";
import { getSupabase } from "@/lib/supabase/client";
import { normaliseIndianMobile } from "@/lib/exams";

/**
 * Students who signed up before mobile/exam were asked (or via another login
 * method) see this once, until both details are filled.
 */
export function ProfileGate() {
  const { t, user, profile, profileLoaded, reloadProfile } = useApp();
  const path = usePathname();
  const [mobile, setMobile] = useState("");
  const [exam, setExam] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!user || !profileLoaded || !profile || path.startsWith("/login") || path.startsWith("/auth")) return null;
  // Column missing (migration 004 not run yet) → don't block anyone.
  if (!("target_exam" in profile)) return null;
  if (profile.phone && profile.target_exam) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normaliseIndianMobile(mobile || profile.phone || "");
    if (!clean) { setErr(t("phone_invalid")); return; }
    if (!exam && !profile.target_exam) { setErr(t("exam_required")); return; }
    setBusy(true); setErr(null);
    const { error } = await getSupabase().from("profiles")
      .update({ phone: clean, target_exam: exam || profile.target_exam })
      .eq("id", user.id);
    setBusy(false);
    if (error) setErr(error.message); else await reloadProfile();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <form 
        onSubmit={save} 
        className="w-full max-w-md space-y-3.5 rounded-t-3xl bg-white p-6 sm:rounded-3xl shadow-2xl" 
        role="dialog" 
        aria-modal="true"
        aria-labelledby="profile-gate-title"
        aria-describedby="profile-gate-desc"
      >
        <div>
          <h2 id="profile-gate-title" className="h-display text-xl">{t("complete_profile_title")}</h2>
          <p id="profile-gate-desc" className="mt-1 text-sm text-stone-600">{t("complete_profile_sub")}</p>
        </div>
        <ProfileFields idPrefix="cp" mobile={mobile || profile.phone || ""} setMobile={setMobile} exam={exam || profile.target_exam || ""} setExam={setExam} />
        {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{err}</p>}
        <p className="text-[11px] text-stone-500">
          Your information is protected under our <a href="/privacy" target="_blank" className="text-maroon underline">Privacy Policy</a> and used only for exam-specific prep updates.
        </p>
        <button className="btn-primary w-full py-3" disabled={busy}>{busy ? t("saving") : t("save_continue")}</button>
      </form>
    </div>
  );
}

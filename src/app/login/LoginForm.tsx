"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/providers";
import { getSupabase } from "@/lib/supabase/client";
import { GOOGLE_AUTH_ENABLED, PHONE_AUTH_ENABLED, isSupabaseConfigured } from "@/lib/supabase/env";
import { ConfigNotice } from "@/components/ui";
import { LogoFull } from "@/components/Logo";
import { ProfileFields } from "@/components/ProfileFields";
import { normaliseIndianMobile } from "@/lib/exams";

export function LoginForm() {
  const { t } = useApp();
  const params = useSearchParams();
  const nextRaw = params.get("next") ?? "/dashboard";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";

  const fromQuiz = /^\/(practice|quiz|result)(\/|$)/.test(next);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [exam, setExam] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    params.get("error") ? { kind: "err", text: t("error") } : null,
  );

  // Full page load so pages prefetched while logged out are not reused.
  const done = () => { window.location.assign(next); };
  const fail = (e: { message: string } | null) => { if (e) setMsg({ kind: "err", text: e.message }); return !!e; };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) return;
    let cleanMobile: string | null = null;
    if (mode === "signup") {
      cleanMobile = normaliseIndianMobile(mobile);
      if (!cleanMobile) { setMsg({ kind: "err", text: t("phone_invalid") }); return; }
      if (!exam) { setMsg({ kind: "err", text: t("exam_required") }); return; }
    }
    setBusy(true); setMsg(null);
    const sb = getSupabase();
    if (mode === "login") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (!fail(error)) done();
    } else {
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { data: { full_name: name.trim(), phone: cleanMobile, target_exam: exam }, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (!fail(error)) {
        if (data.session) done();
        else setMsg({ kind: "ok", text: t("check_email") });
      }
    }
    setBusy(false);
  };

  const google = async () => {
    if (!isSupabaseConfigured) return;
    await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  };

  const normalisedPhone = () => {
    const digits = phone.replace(/\D/g, "");
    return digits.length === 10 ? `+91${digits}` : `+${digits}`;
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error } = await getSupabase().auth.signInWithOtp({ phone: normalisedPhone(), options: { data: name ? { full_name: name } : undefined } });
    if (!fail(error)) setOtpSent(true);
    setBusy(false);
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error } = await getSupabase().auth.verifyOtp({ phone: normalisedPhone(), token: otp, type: "sms" });
    if (!fail(error)) done();
    setBusy(false);
  };

  const forgot = async () => {
    if (!email) { setMsg({ kind: "err", text: t("email") + "?" }); return; }
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` });
    if (!fail(error)) setMsg({ kind: "ok", text: t("reset_sent") });
  };

  return (
    <div className="container-page flex justify-center py-10 sm:py-16">
      <div className="w-full max-w-md">
        <ConfigNotice />
        {fromQuiz && (
          <div className="mb-4 rounded-2xl border border-gold bg-gold-50 p-4 text-sm text-maroon-900">🔒 {t("login_required")}</div>
        )}
        <div className="card p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <LogoFull className="h-16 w-auto" />
            <h1 className="h-display mt-3 text-2xl">{mode === "login" ? t("login_title") : t("signup_title")}</h1>
            <p className="mt-1 text-sm text-stone-500">{t("free_note")}</p>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-xl bg-maroon-50 p-1 text-sm font-semibold">
            {(["login", "signup"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setMsg(null); }} className={`rounded-lg py-2 ${mode === m ? "bg-white text-maroon shadow-sm" : "text-stone-500"}`}>
                {t(m)}
              </button>
            ))}
          </div>

          {GOOGLE_AUTH_ENABLED ? (
            <>
            <button onClick={google} disabled={!isSupabaseConfigured} className="btn-outline mt-5 w-full py-3">
              <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 01-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
              {t("continue_google")}
            </button>

            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-stone-400">
              <span className="h-px flex-1 bg-stone-200" />{t("or")}<span className="h-px flex-1 bg-stone-200" />
            </div>
            </>
          ) : (
            <div className="mt-5" />
          )}

          {method === "email" ? (
            <form onSubmit={submitEmail} className="space-y-3.5">
              {mode === "signup" && (
                <div><label className="label" htmlFor="name">{t("full_name")}</label><input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></div>
              )}
              {mode === "signup" && <ProfileFields idPrefix="su" mobile={mobile} setMobile={setMobile} exam={exam} setExam={setExam} />}
              <div><label className="label" htmlFor="email">{t("email")}</label><input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></div>
              <div>
                <label className="label" htmlFor="pw">{t("password")}</label>
                <input id="pw" type="password" minLength={6} className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required />
              </div>
              {mode === "login" && <button type="button" onClick={forgot} className="text-sm text-maroon hover:underline">{t("forgot")}</button>}
              <button className="btn-primary w-full py-3" disabled={busy || !isSupabaseConfigured}>{busy ? t("loading") : t(mode)}</button>
            </form>
          ) : (
            <form onSubmit={otpSent ? verifyOtp : sendOtp} className="space-y-3.5">
              {mode === "signup" && !otpSent && (
                <div><label className="label" htmlFor="pname">{t("full_name")}</label><input id="pname" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
              )}
              <div>
                <label className="label" htmlFor="phone">{t("phone")}</label>
                <div className="flex gap-2"><span className="input w-16 shrink-0 text-center text-stone-500">+91</span>
                  <input id="phone" inputMode="numeric" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={otpSent} placeholder="98XXXXXXXX" required /></div>
              </div>
              {otpSent && <div><label className="label" htmlFor="otp">{t("otp")}</label><input id="otp" inputMode="numeric" autoComplete="one-time-code" className="input tracking-[.4em]" value={otp} onChange={(e) => setOtp(e.target.value)} required /></div>}
              <button className="btn-primary w-full py-3" disabled={busy}>{busy ? t("loading") : otpSent ? t("verify_otp") : t("send_otp")}</button>
            </form>
          )}

          {PHONE_AUTH_ENABLED && (
            <button onClick={() => { setMethod(method === "email" ? "phone" : "email"); setOtpSent(false); setMsg(null); }} className="mt-4 w-full text-center text-sm font-medium text-maroon hover:underline">
              {method === "email" ? t("use_phone") : t("use_email")}
            </button>
          )}

          {msg && <p className={`mt-4 rounded-xl p-3 text-sm ${msg.kind === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{msg.text}</p>}
        </div>
      </div>
    </div>
  );
}

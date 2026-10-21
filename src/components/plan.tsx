"use client";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useApp } from "@/components/providers";
import { useClerkSupabase } from "@/lib/supabase/clerk-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface Plan {
  enabled: boolean;
  signed_in: boolean;
  is_premium: boolean;
  is_paid?: boolean;
  is_trial?: boolean;
  is_staff?: boolean;
  premium_until?: string | null;
  trial_until?: string | null;
  plan?: string | null;
  free_daily_questions: number;
  free_weekly_tests: number;
  questions_used_today?: number;
  tests_used_week?: number;
  questions_left_today?: number;
  tests_left_week?: number;
  price_monthly: number;
  price_yearly: number;
  trial_days: number;
}

interface PlanCtx {
  plan: Plan | null;
  reloadPlan: () => Promise<void>;
  limited: boolean;
}
const Ctx = createContext<PlanCtx | null>(null);

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useApp();
  const supabase = useClerkSupabase();
  const [plan, setPlan] = useState<Plan | null>(null);

  const reloadPlan = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data, error } = await supabase
        .rpc("my_plan")
        .maybeSingle<Plan>();

      if (error) {
        // Stringify to see the actual Supabase error fields (code, message, details)
        console.error("Failed to load plan:", JSON.stringify(error));
        setPlan(null);
      } else {
        setPlan((data as Plan | null) ?? null);
      }
    } catch (err) {
      console.error("Error in reloadPlan:", err);
      setPlan(null);
    }
  }, [supabase]);

  useEffect(() => {
    if (authReady) {
      reloadPlan();
    }
  }, [authReady, user, reloadPlan]);

  // usage changes while the student practises
  useEffect(() => {
    const onFocus = () => reloadPlan();
    window.addEventListener("focus", onFocus);
    window.addEventListener("plan:changed", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("plan:changed", onFocus);
    };
  }, [reloadPlan]);

  const limited = !!plan?.enabled && !plan.is_premium;
  return <Ctx.Provider value={{ plan, reloadPlan, limited }}>{children}</Ctx.Provider>;
}

export const usePlan = () => {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Return default values if not in provider
    return {
      plan: null,
      reloadPlan: async () => {},
      limited: false,
    };
  }
  return ctx;
};

export type PlanErrorCode =
  | "FREE_LIMIT_QUESTIONS"
  | "FREE_LIMIT_TESTS"
  | "PREMIUM_CA_ARCHIVE"
  | "PREMIUM_MISTAKES"
  | "LOGIN_REQUIRED";

/** Database limit errors start with a code, e.g. "FREE_LIMIT_QUESTIONS:5 …". */
export function parsePlanError(
  msg: string | null | undefined
): { code: PlanErrorCode; left?: number } | null {
  if (!msg) return null;
  const m = /(FREE_LIMIT_QUESTIONS|FREE_LIMIT_TESTS|PREMIUM_CA_ARCHIVE|PREMIUM_MISTAKES|LOGIN_REQUIRED):?(\d+)?/.exec(
    msg
  );
  return m
    ? {
        code: m[1] as PlanErrorCode,
        left: m[2] !== undefined ? Number(m[2]) : undefined,
      }
    : null;
}

export const fmtDate = (
  d: string | null | undefined,
  lang: "en" | "hi"
): string => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString(
      lang === "hi" ? "hi-IN" : "en-IN",
      { day: "numeric", month: "short", year: "numeric" }
    );
  } catch {
    return "";
  }
};

/** Shows a friendly upgrade card for plan errors, or the plain error otherwise. */
export function PlanErrorBox({
  error,
  small,
}: {
  error: string | null;
  small?: boolean;
}) {
  const { lang } = useApp();
  const { plan } = usePlan();
  if (!error) return null;
  const hi = lang === "hi";
  const pe = parsePlanError(error);
  if (!pe) {
    return <p className={`mt-3 rounded-xl bg-red-50 p-3 text-red-800 ${small ? "text-xs" : "text-sm"}`}>{error}</p>;
  }

  const n = plan?.free_daily_questions ?? 25;
  const tw = plan?.free_weekly_tests ?? 1;
  const text: Record<PlanErrorCode, [string, string]> = {
    FREE_LIMIT_QUESTIONS: pe.left
      ? [
          `Free plan: ${n} questions a day. You have ${pe.left} left today — choose ${pe.left} or fewer questions.`,
          `फ्री प्लान: रोज़ ${n} प्रश्न। आज ${pe.left} प्रश्न बचे हैं — ${pe.left} या उससे कम चुनें।`,
        ]
      : [
          `Today’s free limit of ${n} questions is complete. Come back tomorrow, or go Premium for unlimited practice.`,
          `आज की ${n} प्रश्नों की फ्री लिमिट पूरी हो गई। कल फिर आइए, या असीमित अभ्यास के लिए प्रीमियम लें।`,
        ],
    FREE_LIMIT_TESTS: [
      `Free plan includes ${tw} test${tw === 1 ? "" : "s"} a week. New week starts Monday — or go Premium for unlimited tests.`,
      `फ्री प्लान में हफ़्ते में ${tw} टेस्ट। नया हफ़्ता सोमवार से — या असीमित टेस्ट के लिए प्रीमियम लें।`,
    ],
    PREMIUM_CA_ARCHIVE: [
      "Old Current Affairs quizzes are part of Premium. Today’s quiz is free.",
      "पुराने करेंट अफेयर्स क्विज़ प्रीमियम में हैं। आज का क्विज़ फ्री है।",
    ],
    PREMIUM_MISTAKES: [
      "A quiz from your mistakes is part of Premium. You can still read all your mistakes.",
      "गलतियों से क्विज़ प्रीमियम में है। अपनी सभी गलतियाँ आप पढ़ सकते हैं।",
    ],
    LOGIN_REQUIRED: [
      "Please log in to start a quiz.",
      "क्विज़ शुरू करने के लिए लॉग इन करें।",
    ],
  };

  return (
    <div className={`mt-3 rounded-2xl border border-gold/60 bg-gold-50 p-4 text-ink ${small ? "text-xs" : "text-sm"}`}>
      <p>{hi ? text[pe.code][1] : text[pe.code][0]}</p>
      {pe.code === "LOGIN_REQUIRED"
        ? (
            <Link
              href="/login"
              className="btn-primary mt-3 inline-flex px-4 py-2 text-sm"
            >
              {hi ? "लॉग इन करें" : "Log in"} →
            </Link>
          )
        : !(pe.code === "FREE_LIMIT_QUESTIONS" && pe.left) && (
            <Link
              href="/premium"
              className="btn-gold mt-3 inline-flex px-4 py-2 text-sm"
            >
              ⭐ {hi
                ? `प्रीमियम ₹${plan?.price_monthly ?? 99}/माह से`
                : `Go Premium — from ₹${plan?.price_monthly ?? 99}/month`}
            </Link>
          )}
    </div>
  );
}

/** Small line showing what is left on the free plan. */
export function FreeUsage({ kind }: { kind: "questions" | "tests" }) {
  const { lang } = useApp();
  const { plan, limited } = usePlan();
  if (!limited || !plan?.signed_in) return null;
  const hi = lang === "hi";
  const left =
    kind === "questions"
      ? plan.questions_left_today ?? 0
      : plan.tests_left_week ?? 0;
  const total =
    kind === "questions" ? plan.free_daily_questions : plan.free_weekly_tests;
  return (
    <p className="rounded-xl bg-gold-50 px-3 py-2 text-sm text-ink ring-1 ring-gold/40">
      {kind === "questions"
        ? hi
          ? `<>फ्री प्लान: आज <b>${left}</b> / ${total} प्रश्न बचे।</>`
          : `<>Free plan: <b>${left}</b> of ${total} questions left today.</>`
        : hi
        ? `<>फ्री प्लान: इस हफ़्ते <b>${left}</b> / ${total} टेस्ट बचे।</>`
        : `<>Free plan: <b>${left}</b> of ${total} test${total === 1 ? "" : "s"} left this week.</>`}
      {" "}
      <Link
        href="/premium"
        className="font-semibold text-maroon underline"
      >
        {hi ? "असीमित के लिए प्रीमियम" : "Unlimited with Premium"}
      </Link>
    </p>
  );
}
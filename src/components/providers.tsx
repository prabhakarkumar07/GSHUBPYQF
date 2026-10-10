"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { fetchApi } from "@/lib/api-client";
import { translate, type TKey } from "@/lib/i18n";
import type { AppSettings, AppUser, Exam, Lang, Subject, Topic } from "@/lib/types";

interface Profile { id: string; full_name: string | null; role: "student" | "admin"; preferred_lang: Lang; subscription_tier: "free" | "premium" }

interface Taxonomy {
  subjects: Subject[];
  topics: Topic[];
  exams: Exam[];
  settings: AppSettings;
  loaded: boolean;
}

interface AppCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
  /** Pick the right language from a bilingual pair, falling back to English. */
  pick: (en: string | null | undefined, hi: string | null | undefined) => string;
  /** Clerk user object (null when signed out). */
  user: AppUser | null;
  profile: Profile | null;
  isAdmin: boolean;
  authReady: boolean;
  taxonomy: Taxonomy;
  reloadTaxonomy: () => Promise<void>;
  subjectName: (id: number | null | undefined) => string;
  paywall: string | null;
  showPaywall: (type: string | null) => void;
  topicName: (id: number | null | undefined) => string;
  examName: (id: number | null | undefined) => string;
}

const DEFAULT_SETTINGS: AppSettings = { positive_marks: 1, negative_marks: 0.33, seconds_per_question: 48, min_stats_attempts: 5 };
const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [paywall, showPaywall] = useState<string | null>(null);
  const [taxonomy, setTaxonomy] = useState<Taxonomy>({ subjects: [], topics: [], exams: [], settings: DEFAULT_SETTINGS, loaded: false });

  // Clerk auth state
  const { user: clerkUser, isLoaded } = useUser();
  const { getToken } = useAuth();

  // Expose a simplified user object so the rest of the app doesn't need to know about Clerk
  const user = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        name: clerkUser.fullName ?? undefined,
      }
    : null;

  const authReady = isLoaded;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("gshub_lang");
      if (saved === "en" || saved === "hi") setLangState(saved);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "hi" ? "hi" : "en";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("gshub_lang", l); } catch { /* ignore */ }
  }, []);

  // Load profile from new API backend whenever the Clerk user changes
  useEffect(() => {
    if (!clerkUser) {
      setProfile(null);
      return;
    }
    
    async function loadOrCreateProfile() {
      try {
        const token = await getToken({ template: "supabase" });
        const { profile: loadedProfile } = await fetchApi("/profile/loadOrCreate", {
          method: "POST",
          body: JSON.stringify({
            user: {
              id: clerkUser!.id,
              name: clerkUser!.fullName,
              email: clerkUser!.primaryEmailAddress?.emailAddress
            }
          })
        }, token);
        setProfile(loadedProfile as Profile);
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    }

    loadOrCreateProfile();
  }, [clerkUser, getToken]);

  const reloadTaxonomy = useCallback(async () => {
    try {
      const data = await fetchApi("/taxonomy");
      setTaxonomy({
        subjects: data.subjects ?? [],
        topics: data.topics ?? [],
        exams: data.exams ?? [],
        settings: data.settings
          ? { positive_marks: Number(data.settings.positive_marks), negative_marks: Number(data.settings.negative_marks), seconds_per_question: data.settings.seconds_per_question, min_stats_attempts: data.settings.min_stats_attempts }
          : DEFAULT_SETTINGS,
        loaded: true,
      });
    } catch (err) {
      console.error("Failed to load taxonomy:", err);
    }
  }, []);

  useEffect(() => { reloadTaxonomy(); }, [reloadTaxonomy]);

  const value = useMemo<AppCtx>(() => {
    const pick = (en: string | null | undefined, hi: string | null | undefined) =>
      (lang === "hi" ? hi || en : en || hi) ?? "";
    const subjectName = (id: number | null | undefined) => {
      const s = taxonomy.subjects.find((x) => x.id === id);
      return s ? pick(s.name_en, s.name_hi) : "â€”";
    };
    const topicName = (id: number | null | undefined) => {
      const s = taxonomy.topics.find((x) => x.id === id);
      return s ? pick(s.name_en, s.name_hi) : "â€”";
    };
    const examName = (id: number | null | undefined) => {
      const s = taxonomy.exams.find((x) => x.id === id);
      return s ? pick(s.name_en, s.name_hi) : "";
    };
    return {
      lang, setLang,
      t: (key, vars) => translate(lang, key, vars),
      pick, user, profile, isAdmin: profile?.role === "admin", authReady,
      taxonomy, reloadTaxonomy, subjectName, topicName, examName,
    };
  }, [lang, setLang, user, profile, authReady, taxonomy, reloadTaxonomy]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}


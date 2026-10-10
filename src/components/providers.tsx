"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { translate, type TKey } from "@/lib/i18n";
import type { AppSettings, Exam, Lang, Subject, Topic } from "@/lib/types";

interface Profile { id: string; full_name: string | null; role: "student" | "admin"; preferred_lang: Lang; phone?: string | null; target_exam?: string | null }

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
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  authReady: boolean;
  profileLoaded: boolean;
  reloadProfile: () => Promise<void>;
  taxonomy: Taxonomy;
  reloadTaxonomy: () => Promise<void>;
  subjectName: (id: number | null | undefined) => string;
  topicName: (id: number | null | undefined) => string;
  examName: (id: number | null | undefined) => string;
}

const DEFAULT_SETTINGS: AppSettings = { positive_marks: 1, negative_marks: 0.33, seconds_per_question: 48, min_stats_attempts: 5 };
const Ctx = createContext<AppCtx | null>(null);
const TAX_CACHE = "gshub_taxonomy_v1";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const profileLoader = useRef<(u: User | null) => Promise<void>>(async () => {});
  const [taxonomy, setTaxonomy] = useState<Taxonomy>({ subjects: [], topics: [], exams: [], settings: DEFAULT_SETTINGS, loaded: false });

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

  // Auth
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();
    const loadProfile = async (u: User | null) => {
      if (!u) { setProfile(null); setProfileLoaded(true); return; }
      // select("*") keeps working whether or not the newer profile columns exist yet
      const { data } = await sb.from("profiles").select("*").eq("id", u.id).maybeSingle();
      setProfile((data as Profile) ?? null);
      setProfileLoaded(true);
    };
    profileLoader.current = loadProfile;
    // getSession() reads the stored session instantly (no network round-trip);
    // the server-side middleware already verifies it on protected pages.
    sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      setAuthReady(true);
      loadProfile(u);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      loadProfile(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Show the last-known subjects/topics instantly, then refresh from the server.
  useEffect(() => {
    try {
      const cached = localStorage.getItem(TAX_CACHE);
      if (cached) setTaxonomy((cur) => (cur.loaded ? cur : { ...(JSON.parse(cached) as Taxonomy), loaded: true }));
    } catch { /* ignore */ }
  }, []);

  const reloadTaxonomy = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();
    const [s, t, e, st] = await Promise.all([
      sb.from("subjects").select("*").order("sort_order"),
      sb.from("topics").select("*").order("sort_order"),
      sb.from("exams").select("*").order("sort_order"),
      sb.from("app_settings").select("positive_marks, negative_marks, seconds_per_question, min_stats_attempts").eq("id", 1).maybeSingle(),
    ]);
    if (s.error || t.error || e.error) return;
    const next: Taxonomy = {
      subjects: (s.data as Subject[]) ?? [],
      topics: (t.data as Topic[]) ?? [],
      exams: (e.data as Exam[]) ?? [],
      settings: st.data
        ? { positive_marks: Number(st.data.positive_marks), negative_marks: Number(st.data.negative_marks), seconds_per_question: st.data.seconds_per_question, min_stats_attempts: st.data.min_stats_attempts }
        : DEFAULT_SETTINGS,
      loaded: true,
    };
    setTaxonomy(next);
    try { localStorage.setItem(TAX_CACHE, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  useEffect(() => { reloadTaxonomy(); }, [reloadTaxonomy]);

  const value = useMemo<AppCtx>(() => {
    const pick = (en: string | null | undefined, hi: string | null | undefined) =>
      (lang === "hi" ? hi || en : en || hi) ?? "";
    const subjectName = (id: number | null | undefined) => {
      const s = taxonomy.subjects.find((x) => x.id === id);
      return s ? pick(s.name_en, s.name_hi) : "—";
    };
    const topicName = (id: number | null | undefined) => {
      const s = taxonomy.topics.find((x) => x.id === id);
      return s ? pick(s.name_en, s.name_hi) : "—";
    };
    const examName = (id: number | null | undefined) => {
      const s = taxonomy.exams.find((x) => x.id === id);
      return s ? pick(s.name_en, s.name_hi) : "";
    };
    return {
      lang, setLang,
      t: (key, vars) => translate(lang, key, vars),
      pick, user, profile, isAdmin: profile?.role === "admin", authReady, profileLoaded,
      reloadProfile: () => profileLoader.current(user),
      taxonomy, reloadTaxonomy, subjectName, topicName, examName,
    };
  }, [lang, setLang, user, profile, authReady, profileLoaded, taxonomy, reloadTaxonomy]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

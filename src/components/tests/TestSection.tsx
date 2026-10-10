"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/providers";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { TEST_CATEGORIES, type TestCategory, type TestSummary } from "@/lib/tests";
import { TestCard } from "./TestCard";

/** Home-page block: a few latest tests of one category + "View all". */
export function TestSection({ category, limit = 2, tinted }: { category: TestCategory; limit?: number; tinted?: boolean }) {
  const { lang, authReady, user } = useApp();
  const [tests, setTests] = useState<TestSummary[] | null>(null);
  const meta = TEST_CATEGORIES[category];
  const hi = lang === "hi";

  useEffect(() => {
    if (!isSupabaseConfigured || !authReady) return;
    getSupabase().rpc("list_tests", { p_category: category, p_limit: limit }).then(({ data, error }) => setTests(error ? [] : ((data as TestSummary[]) ?? [])));
  }, [category, limit, authReady, user]);

  return (
    <section className={tinted ? "border-y border-gold/30 bg-gold-50/50" : ""}>
      <div className="container-page py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-3xl" aria-hidden>{meta.icon}</div>
            <h2 className="h-display mt-1 text-2xl sm:text-3xl">{hi ? meta.hi : meta.en}</h2>
            <p className="mt-1 max-w-2xl text-[15px] text-stone-600">{hi ? meta.subHi : meta.subEn}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {tests === null
            ? [0, 1].slice(0, limit).map((i) => <div key={i} className="card h-64 animate-pulse bg-white/60" />)
            : tests.map((t) => <TestCard key={t.id} test={t} />)}
        </div>
        {tests?.length === 0 && (
          <div className="mt-2 rounded-2xl border border-dashed border-maroon/20 bg-white p-8 text-center text-stone-500">
            {hi ? "जल्द आ रहा है — नए टेस्ट जल्द ही जोड़े जाएँगे।" : "Coming soon — new tests will be added shortly."}
          </div>
        )}
        <div className="mt-6 text-center">
          <Link href={`/tests/${meta.slug}`} className="btn-primary px-6 py-3">{hi ? "सभी टेस्ट देखें" : "View all tests"} →</Link>
        </div>
      </div>
    </section>
  );
}

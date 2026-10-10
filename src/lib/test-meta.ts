// Shared (server + client) test metadata.
export type TestCategory = "pyq_full" | "monthly";

/** URL slug ↔ category */
export const TEST_CATEGORIES: Record<TestCategory, { slug: string; en: string; hi: string; subEn: string; subHi: string; icon: string }> = {
  pyq_full: {
    slug: "pyq-full-length", icon: "📝",
    en: "PYQ Full Length Tests", hi: "PYQ फुल लेंथ टेस्ट",
    subEn: "Attempt complete BPSC previous-year papers in real exam conditions — timer, negative marking and all-India style result.",
    subHi: "पूरे BPSC पिछले वर्ष के प्रश्नपत्र असली परीक्षा जैसे माहौल में दें — टाइमर, नेगेटिव मार्किंग और विस्तृत रिज़ल्ट के साथ।",
  },
  monthly: {
    slug: "monthly-mcq", icon: "🗓️",
    en: "Monthly MCQ Practice", hi: "मासिक MCQ अभ्यास",
    subEn: "Month-wise MCQ tests on current affairs and important topics. A new set every month.",
    subHi: "करेंट अफेयर्स और महत्वपूर्ण विषयों पर माहवार MCQ टेस्ट। हर महीने नया सेट।",
  },
};
export const categoryFromSlug = (slug: string): TestCategory | null =>
  (Object.keys(TEST_CATEGORIES) as TestCategory[]).find((c) => TEST_CATEGORIES[c].slug === slug) ?? null;

export interface TestSummary {
  id: string; category: TestCategory; title_en: string; title_hi: string | null;
  description_en: string | null; description_hi: string | null; month: string | null;
  duration_min: number; positive_marks: number; negative_marks: number; question_count: number;
  my_attempts?: number; my_best?: number | null; my_last_attempt?: string | null; created_at: string;
}

export const monthLabel = (m: string | null, lang: "en" | "hi") =>
  m ? new Date(`${m.slice(0, 10)}T00:00:00`).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { month: "long", year: "numeric" }) : "";


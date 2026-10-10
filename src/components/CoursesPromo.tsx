"use client";
import { useApp } from "@/components/providers";

export const COURSES_URL = "https://gshubsite.com/new-courses";

const BATCHES = [
  { tag: { en: "Foundation", hi: "फाउंडेशन" }, name: { en: "Junoon – 73rd BPSC Foundation", hi: "जुनून – 73वीं BPSC फाउंडेशन" }, d: { en: "Prelims + Mains + Interview, complete course", hi: "प्रारंभिक + मुख्य + साक्षात्कार, पूरा कोर्स" } },
  { tag: { en: "Mentorship", hi: "मेंटरशिप" }, name: { en: "Ummeed – BPSC Mentorship", hi: "उम्मीद – BPSC मेंटरशिप" }, d: { en: "Personal guidance and a daily study plan", hi: "व्यक्तिगत मार्गदर्शन और रोज़ का स्टडी प्लान" } },
  { tag: { en: "Answer writing", hi: "उत्तर लेखन" }, name: { en: "Lekhni – Mains Answer Writing", hi: "लेखनी – मुख्य परीक्षा उत्तर लेखन" }, d: { en: "Daily questions with copy evaluation", hi: "रोज़ प्रश्न और कॉपी जाँच" } },
  { tag: { en: "Prelims", hi: "प्रारंभिक" }, name: { en: "Nirnayak – Prelims Mentorship & Test Series", hi: "निर्णायक – प्रारंभिक मेंटरशिप और टेस्ट सीरीज़" }, d: { en: "Short, focused batches before the exam", hi: "परीक्षा से पहले छोटे, केंद्रित बैच" } },
];

export function CoursesPromo() {
  const { lang } = useApp();
  const L = (x: { en: string; hi: string }) => (lang === "hi" ? x.hi : x.en);
  return (
    <section className="container-page pt-12">
      <a href={COURSES_URL} target="_blank" rel="noopener" className="group block overflow-hidden rounded-3xl bg-maroon-900 text-white shadow-lg ring-1 ring-gold/40 transition hover:ring-gold">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div>
            <span className="inline-block rounded-full bg-gold px-3 py-1 text-xs font-bold uppercase tracking-wider text-maroon-900">
              {lang === "hi" ? "GS Hub पेड बैच" : "GS Hub paid batches"}
            </span>
            <h2 className="mt-4 font-display text-2xl font-bold leading-snug sm:text-3xl">
              {lang === "hi" ? "PYQ के साथ पूरी तैयारी चाहिए? हमारे बैच से जुड़ें" : "Want complete preparation? Join a GS Hub batch"}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/75">
              {lang === "hi"
                ? "BPSC फाउंडेशन, मेंटरशिप, उत्तर लेखन, टेस्ट सीरीज़ और करेंट अफेयर्स मैगज़ीन — रियायती फीस के साथ।"
                : "BPSC foundation, mentorship, answer writing, test series and current-affairs magazines — at discounted fees."}
            </p>
            <span className="btn-gold mt-6 inline-flex px-6 py-3 text-base group-hover:brightness-105">
              {lang === "hi" ? "सभी कोर्स देखें" : "View all courses"} →
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {BATCHES.map((b) => (
              <div key={b.name.en} className="rounded-2xl bg-white/[.07] p-4 ring-1 ring-white/10">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gold-300">{L(b.tag)}</div>
                <div className="mt-1 font-semibold leading-snug">{L(b.name)}</div>
                <div className="mt-1 text-sm text-white/65">{L(b.d)}</div>
              </div>
            ))}
          </div>
        </div>
      </a>
    </section>
  );
}

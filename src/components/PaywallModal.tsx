"use client";
import { useRouter } from "next/navigation";
import { useApp } from "./providers";
import { IconCheck } from "./icons";

const BENEFITS = {
  hi: ["अनलिमिटेड प्रश्न — कोई दैनिक सीमा नहीं", "सभी PYQ — नवीनतम 66वीं–71वीं समेत", "हर विकल्प का पूरा हल (हिंदी + English)", "सभी छात्रों से तुलना — “91% ने सही किया”", "पूरी गलतियों की नोटबुक + स्मार्ट क्विज़", "टॉपिक-वार हीट मैप + अनलिमिटेड 150-प्रश्न मॉक"],
  en: ["Unlimited questions — no daily limit", "All PYQs incl. latest 66th–71st", "Full option-wise solutions (Hindi + English)", "Compare with every student — “91% got this right”", "Complete Mistake Notebook + Smart Quiz", "Topic-level heat map + unlimited 150-Q mocks"]
};

const PW: Record<string, string[]> = {
  limit: ["⏳", "आज के 20 मुफ़्त प्रश्न पूरे!", "Today's 20 free questions are done!", "कल फिर 20 मुफ़्त मिलेंगे — या अभी अनलिमिटेड अभ्यास खोलें।", "You get 20 more tomorrow — or unlock unlimited practice now."],
  years: ["📅", "नवीनतम PYQ — 66वीं से 71वीं", "Latest PYQs — 66th to 71st", "हाल की परीक्षाओं के प्रश्न सबसे ज़रूरी हैं। Premium में सब खुलेंगे।", "The most recent papers matter most. Premium unlocks every year."],
  solution: ["💡", "हर विकल्प का पूरा हल", "The full option-wise explanation", "जानिए बाकी विकल्प क्यों गलत हैं — यही असली सीख है।", "Learn why every other option is wrong — that's where the real learning is."],
  compare: ["📊", "सबसे अपनी तुलना करें", "See how you compare", "“91% छात्रों ने सही किया — आपसे छूट गया” — ऐसे प्रश्न ही असली अंक काटते हैं।", "“91% of students got this right — you missed it.” These are the questions that really cost marks."],
  smart: ["🎯", "गलतियों से स्मार्ट क्विज़", "Smart Quiz from Mistakes", "सिर्फ़ अपनी पुरानी गलतियों से क्विज़ — नोटबुक खाली होने तक।", "A quiz made only of your past mistakes — until the notebook is empty."],
  exam: ["⏱️", "इस हफ्ते का मुफ़्त मॉक हो गया", "This week's free mock is used", "Premium में अनलिमिटेड एग्ज़ाम मोड, 150 प्रश्नों वाला पूरा मॉक भी।", "Premium gives unlimited exam mode, including full 150-question mocks."],
  heatmap: ["🗺️", "टॉपिक-वार हीट मैप", "Topic-level heat map", "Economy में Banking मज़बूत, Fiscal Policy कमज़ोर — ठीक-ठीक जानिए क्या पढ़ना है।", "Economy → Banking strong, Fiscal Policy weak — know exactly what to study next."],
  notebook: ["📒", "पूरी गलतियों की नोटबुक", "Your complete Mistake Notebook", "मुफ़्त में 10 गलतियाँ दिखती हैं। Premium में सब, हमेशा।", "Free shows 10 mistakes. Premium shows all of them, always."],
};

export function PaywallModal() {
  const { lang, paywall, showPaywall } = useApp();
  const router = useRouter();

  if (!paywall) return null;
  const p = PW[paywall] || PW.limit;
  const isHi = lang === "hi";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={() => showPaywall(null)}>
      <div className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative bg-maroon px-6 pb-6 pt-7 text-center text-white">
          <div className="pattern-dots absolute inset-0 opacity-30"></div>
          <div className="relative">
            <div className="text-5xl">{p[0]}</div>
            <h2 className="mt-3 font-display text-xl font-bold">{isHi ? p[1] : p[2]}</h2>
            <p className="mt-2 text-sm text-white/80">{isHi ? p[3] : p[4]}</p>
          </div>
        </div>
        <div className="p-6">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-gold-700">⭐ {isHi ? "Premium में मिलेगा" : "Premium includes"}</div>
          <ul className="space-y-2 text-sm">
            {BENEFITS[lang].map((b, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-white"><IconCheck /></span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <button onClick={() => { showPaywall(null); router.push("/pricing"); }} className="btn-gold mt-5 w-full py-3 text-base">
            {isHi ? "Premium लें — ₹99 से" : "Get Premium — from ₹99"}
          </button>
          <button onClick={() => showPaywall(null)} className="mt-3 w-full text-center text-sm text-stone-500">
            {paywall === "limit" ? (isHi ? "कल आऊँगा" : "I'll come back tomorrow") : (isHi ? "अभी नहीं" : "Maybe later")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Exams a student can choose at sign-up ("Which exam are you preparing for?").
// value is stored in profiles.target_exam — keep values stable once in use.
export const TARGET_EXAMS: { value: string; en: string; hi: string }[] = [
  { value: "BPSC CCE", en: "BPSC Combined (Prelims + Mains)", hi: "बीपीएससी संयुक्त (प्रारंभिक + मुख्य)" },
  { value: "BPSC TRE", en: "BPSC TRE (Teacher)", hi: "बीपीएससी टीआरई (शिक्षक)" },
  { value: "UPSC CSE", en: "UPSC Civil Services", hi: "यूपीएससी सिविल सेवा" },
  { value: "BPSSC SI", en: "Bihar SI / Daroga (BPSSC)", hi: "बिहार दारोगा (बीपीएसएससी)" },
  { value: "Bihar Police", en: "Bihar Police Constable", hi: "बिहार पुलिस सिपाही" },
  { value: "BSSC", en: "BSSC (Inter / Graduate level)", hi: "बीएसएससी (इंटर / स्नातक स्तर)" },
  { value: "Other", en: "Other exam", hi: "अन्य परीक्षा" },
];

/** Accepts "98765 43210", "+91 9876543210", "09876543210" → "9876543210" (or null if invalid). */
export function normaliseIndianMobile(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

"use client";
import { useApp } from "./providers";
import { TARGET_EXAMS } from "@/lib/exams";

/** Mobile number + "which exam" fields, shared by sign-up and the complete-profile box. */
export function ProfileFields({ mobile, setMobile, exam, setExam, idPrefix = "pf" }: {
  mobile: string; setMobile: (v: string) => void; exam: string; setExam: (v: string) => void; idPrefix?: string;
}) {
  const { t, lang } = useApp();
  return (
    <>
      <div>
        <label className="label" htmlFor={`${idPrefix}-mobile`}>{t("phone")}</label>
        <div className="flex gap-2">
          <span className="input w-16 shrink-0 text-center text-stone-500">+91</span>
          <input id={`${idPrefix}-mobile`} type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} className="input"
            placeholder="98XXXXXXXX" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`${idPrefix}-exam`}>{t("target_exam")}</label>
        <select id={`${idPrefix}-exam`} className="input" value={exam} onChange={(e) => setExam(e.target.value)} required>
          <option value="" disabled>{t("choose_exam")}</option>
          {TARGET_EXAMS.map((x) => <option key={x.value} value={x.value}>{lang === "hi" ? x.hi : x.en}</option>)}
        </select>
      </div>
    </>
  );
}

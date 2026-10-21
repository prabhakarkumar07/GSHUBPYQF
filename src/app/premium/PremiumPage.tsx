"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers";
import { fmtDate, usePlan } from "@/components/plan";
import { CONTACT } from "@/components/Footer";
import { getSupabase } from "@/lib/supabase/client";

type PlanId = "monthly" | "yearly";
interface CouponPrice { ok: boolean; message?: string; price: number; final: number; off: number; code?: string }
interface Offer { code: string; description: string | null; discount_type: "percent" | "flat"; discount_value: number; applies_to: "both" | "monthly" | "yearly"; valid_until: string | null }
interface RzpResponse { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
declare global { interface Window { Razorpay?: new (o: Record<string, unknown>) => { open: () => void; on: (e: string, f: (r: unknown) => void) => void } } }

const loadCheckout = () => new Promise<boolean>((resolve) => {
  if (window.Razorpay) return resolve(true);
  const s = document.createElement("script");
  s.src = "https://checkout.razorpay.com/v1/checkout.js";
  s.onload = () => resolve(true);
  s.onerror = () => resolve(false);
  document.body.appendChild(s);
});

export function PremiumPage() {
  const { lang, user, profile } = useApp();
  const { plan, reloadPlan } = usePlan();
  const router = useRouter();
  const hi = lang === "hi";
  const [online, setOnline] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/premium/config").then((r) => r.json()).then((d) => setOnline(!!d.online)).catch(() => setOnline(false));
  }, []);

  // Coupons
  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState<{ code: string; monthly: CouponPrice; yearly: CouponPrice } | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  useEffect(() => {
    getSupabase().rpc("public_coupons").then(({ data }) => setOffers((data as Offer[]) ?? []));
  }, []);
  const applyCoupon = async (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code) return;
    setChecking(true); setCouponMsg(null);
    const { data, error } = await getSupabase().rpc("check_coupon", { p_code: code });
    setChecking(false);
    if (error) { setCouponMsg({ ok: false, text: error.message }); return; }
    const r = data as { monthly: CouponPrice; yearly: CouponPrice };
    if (!r.monthly.ok && !r.yearly.ok) {
      setApplied(null);
      setCouponMsg({ ok: false, text: r.monthly.message || r.yearly.message || "Coupon not valid" });
      return;
    }
    setCodeInput(code); setApplied({ code, ...r });
    const best = Math.max(r.monthly.ok ? r.monthly.off : 0, r.yearly.ok ? r.yearly.off : 0);
    setCouponMsg({ ok: true, text: hi ? `कूपन ${code} लगा — ₹${best} तक की छूट।` : `Coupon ${code} applied — up to ₹${best} off.` });
  };
  const removeCoupon = () => { setApplied(null); setCodeInput(""); setCouponMsg(null); };
  const finalFor = (p: PlanId) => (applied && applied[p].ok ? applied[p].final : null);

  const pm = plan?.price_monthly ?? 99, py = plan?.price_yearly ?? 299;
  const save = Math.max(0, Math.round(100 - (py / (pm * 12)) * 100));
  const nq = plan?.free_daily_questions ?? 25, nt = plan?.free_weekly_tests ?? 1;

  const waLink = (p: PlanId) => `https://wa.me/${CONTACT.phoneIntl}?text=${encodeURIComponent(
    `Hello GS Hub, I want to buy PYQ Portal Premium — ${p === "yearly" ? `Yearly ₹${finalFor(p) ?? py}` : `Monthly ₹${finalFor(p) ?? pm}`}${applied && applied[p].ok ? ` (coupon ${applied.code})` : ""}.\nName: ${profile?.full_name ?? ""}\nEmail: ${user?.email ?? ""}`)}`;

  const buy = async (p: PlanId) => {
    if (!user) { router.push("/login?next=/premium"); return; }
    if (!online) { window.open(waLink(p), "_blank", "noopener"); return; }
    setBusy(p); setMsg(null);
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      const auth = { Authorization: `Bearer ${session?.access_token ?? ""}`, "Content-Type": "application/json" };
      const r = await fetch("/api/premium/order", { method: "POST", headers: auth, body: JSON.stringify({ plan: p, coupon: applied && applied[p].ok ? applied.code : "" }) });
      const o = await r.json();
      if (!r.ok) throw new Error(o.error || "Could not start payment");
      if (o.free) {
        setBusy(null); await reloadPlan();
        setMsg({ ok: true, text: hi ? `कूपन से प्रीमियम चालू! ${fmtDate(o.until, lang)} तक।` : `Premium is active until ${fmtDate(o.until, lang)} — thanks to your coupon.` });
        return;
      }
      if (!(await loadCheckout()) || !window.Razorpay) throw new Error(hi ? "पेमेंट पेज नहीं खुला। इंटरनेट जाँचें और फिर कोशिश करें।" : "Could not open the payment window. Check your internet and try again.");
      const rz = new window.Razorpay({
        key: o.keyId, order_id: o.orderId, amount: o.amount, currency: "INR",
        name: "GS Hub PYQ Portal", description: p === "yearly" ? "Premium — 1 year" : "Premium — 1 month",
        prefill: { name: profile?.full_name ?? "", email: user.email ?? "", contact: profile?.phone ?? "" },
        theme: { color: "#6B0F1A" },
        modal: { ondismiss: () => setBusy(null) },
        handler: async (resp: RzpResponse) => {
          const v = await fetch("/api/premium/verify", { method: "POST", headers: auth, body: JSON.stringify(resp) });
          const d = await v.json();
          setBusy(null);
          if (!v.ok) { setMsg({ ok: false, text: d.error || "Verification failed" }); return; }
          await reloadPlan();
          setMsg({ ok: true, text: hi ? `प्रीमियम चालू! ${fmtDate(d.until, lang)} तक।` : `Premium is active until ${fmtDate(d.until, lang)}.` });
        },
      });
      rz.on("payment.failed", () => { setBusy(null); setMsg({ ok: false, text: hi ? "पेमेंट नहीं हुआ। फिर से कोशिश करें।" : "Payment failed. Please try again." }); });
      rz.open();
    } catch (e) { setBusy(null); setMsg({ ok: false, text: (e as Error).message }); }
  };

  const rows: [string, string, string, string][] = [
    ["Practice questions (PYQ)", "प्रैक्टिस प्रश्न (PYQ)", hi ? `${nq} / दिन` : `${nq} / day`, hi ? "असीमित" : "Unlimited"],
    ["Tests (PYQ full length + test series)", "टेस्ट (PYQ फुल लेंथ + टेस्ट सीरीज़)", hi ? `${nt} / हफ़्ता` : `${nt} / week`, hi ? "असीमित" : "Unlimited"],
    ["Current Affairs Daily Quiz", "करेंट अफेयर्स डेली क्विज़", hi ? "आज का" : "Today’s quiz", hi ? "सभी पुराने क्विज़ भी" : "Full archive"],
    ["Quiz from your mistakes", "गलतियों से क्विज़", "—", "✓"],
    ["Explanations, Practice & Exam mode", "व्याख्या, प्रैक्टिस और एग्ज़ाम मोड", "✓", "✓"],
    ["Mistake Notebook, Bookmarks, Heat Map", "मिस्टेक नोटबुक, बुकमार्क, हीट मैप", "✓", "✓"],
    ["Leaderboard & Challenge friends", "लीडरबोर्ड और दोस्तों को चैलेंज", "✓", hi ? "✓ + ⭐ बैज" : "✓ + ⭐ badge"],
  ];

  return (
    <div className={hi ? "font-hindi" : ""}>
      <section className="bg-maroon text-white">
        <div className="container-page py-10 text-center">
          <div className="text-4xl" aria-hidden>⭐</div>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">GS Hub Premium</h1>
          <p className="mx-auto mt-2 max-w-xl text-white/80">{hi ? "असीमित प्रश्न, असीमित टेस्ट और पूरा करेंट अफेयर्स — बिना रुके तैयारी।" : "Unlimited questions, unlimited tests and the full current affairs archive — practise without stopping."}</p>
        </div>
      </section>

      <div className="container-page py-10">
        {plan && !plan.enabled && (
          <p className="mx-auto mb-6 max-w-2xl rounded-2xl bg-green-50 p-4 text-center text-green-900 ring-1 ring-green-200">{hi ? "अभी सभी फ़ीचर सबके लिए खुले हैं — कोई लिमिट नहीं।" : "Right now every feature is open to everyone — no limits."}</p>
        )}
        {plan?.signed_in && plan.is_premium && !plan.is_staff && (
          <p className="mx-auto mb-6 max-w-2xl rounded-2xl bg-gold-50 p-4 text-center ring-1 ring-gold/50">
            {plan.is_paid
              ? (hi ? <>⭐ आपका प्रीमियम <b>{fmtDate(plan.premium_until, lang)}</b> तक चालू है। अभी खरीदने पर समय आगे जुड़ जाएगा।</> : <>⭐ Your Premium is active until <b>{fmtDate(plan.premium_until, lang)}</b>. Buying again adds time after that.</>)
              : (hi ? <>आपका फ्री ट्रायल <b>{fmtDate(plan.trial_until, lang)}</b> तक है। उसके बाद फ्री प्लान की लिमिट लागू होगी।</> : <>Your free trial runs until <b>{fmtDate(plan.trial_until, lang)}</b>. After that the free plan limits apply.</>)}
          </p>
        )}
        {msg && <p className={`mx-auto mb-6 max-w-2xl rounded-2xl p-4 text-center ${msg.ok ? "bg-green-50 text-green-900" : "bg-red-50 text-red-800"}`}>{msg.text}</p>}

        <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-2">
          {(["monthly", "yearly"] as PlanId[]).map((p) => {
            const yearly = p === "yearly";
            return (
              <div key={p} className={`card relative flex flex-col p-6 ${yearly ? "ring-2 ring-gold" : ""}`}>
                {yearly && save > 0 && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-1 text-xs font-bold text-maroon-900">{hi ? `सबसे फ़ायदेमंद · ${save}% बचत` : `Best value · save ${save}%`}</span>}
                <h2 className="text-lg font-bold text-maroon">{yearly ? (hi ? "सालाना" : "Yearly") : (hi ? "मासिक" : "Monthly")}</h2>
                <div className="mt-2 font-display text-4xl font-bold text-ink">
                  {finalFor(p) !== null && <span className="mr-2 text-xl font-normal text-stone-400 line-through">₹{yearly ? py : pm}</span>}
                  ₹{finalFor(p) ?? (yearly ? py : pm)}<span className="text-base font-normal text-stone-500"> / {yearly ? (hi ? "साल" : "year") : (hi ? "महीना" : "month")}</span>
                </div>
                {applied && !applied[p].ok && <p className="mt-1 text-xs text-stone-500">{hi ? "यह कूपन इस प्लान पर नहीं लगता" : "Coupon not valid on this plan"}</p>}
                {applied && applied[p].ok && <p className="mt-1 text-xs font-semibold text-green-700">{hi ? `कूपन ${applied.code}: ₹${applied[p].off} की छूट` : `Coupon ${applied.code}: ₹${applied[p].off} off`}</p>}
                <p className="mt-1 text-sm text-stone-600">{yearly ? (hi ? `सिर्फ़ ₹${Math.round((finalFor(p) ?? py) / 12)} प्रति माह` : `Just ₹${Math.round((finalFor(p) ?? py) / 12)} a month`) : (hi ? "कभी भी शुरू करें" : "Start any time")}</p>
                <div className="mt-auto pt-5">
                  <button onClick={() => buy(p)} disabled={!!busy || (plan ? !plan.enabled : false)} className={`${yearly ? "btn-gold" : "btn-primary"} w-full py-3`}>
                    {busy === p ? (hi ? "खुल रहा है…" : "Opening…") : online === false ? (hi ? "WhatsApp पर खरीदें" : "Buy on WhatsApp") : (hi ? "अभी लें" : "Get Premium")} →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {plan?.enabled !== false && (
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl bg-white p-4 ring-1 ring-gold/40 sm:p-5">
            <label className="label" htmlFor="coupon">{hi ? "कूपन कोड है?" : "Have a coupon code?"}</label>
            <div className="flex gap-2">
              <input id="coupon" className="input flex-1 uppercase" placeholder={hi ? "कोड लिखें" : "Enter code"} value={codeInput} maxLength={30}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))} onKeyDown={(e) => { if (e.key === "Enter") applyCoupon(codeInput); }} disabled={!!applied} />
              {applied
                ? <button className="btn-outline" onClick={removeCoupon}>{hi ? "हटाएँ" : "Remove"}</button>
                : <button className="btn-primary" disabled={checking || !codeInput.trim()} onClick={() => applyCoupon(codeInput)}>{checking ? "…" : hi ? "लगाएँ" : "Apply"}</button>}
            </div>
            {couponMsg && <p className={`mt-2 text-sm ${couponMsg.ok ? "text-green-700" : "text-red-700"}`}>{couponMsg.text}</p>}
            {offers.length > 0 && !applied && (
              <div className="mt-3 flex flex-wrap gap-2">
                {offers.map((o) => (
                  <button key={o.code} onClick={() => applyCoupon(o.code)} className="rounded-xl border border-dashed border-gold bg-gold-50 px-3 py-2 text-left text-sm hover:bg-gold-100">
                    <b className="font-mono text-maroon">{o.code}</b>
                    <span className="ml-2 text-stone-700">{o.discount_type === "percent" ? `${Number(o.discount_value)}% off` : `₹${Number(o.discount_value)} off`}{o.applies_to !== "both" ? (o.applies_to === "yearly" ? (hi ? " · सालाना" : " · yearly") : (hi ? " · मासिक" : " · monthly")) : ""}</span>
                    {o.description && <span className="block text-xs text-stone-500">{o.description}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {online === false && plan?.enabled && (
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-stone-600">{hi ? "ऑनलाइन पेमेंट जल्द आ रहा है। अभी WhatsApp या ऑफ़लाइन सेंटर पर UPI/कैश से भुगतान करें — हम आपका प्रीमियम तुरंत चालू कर देंगे।" : "Online payment is coming soon. For now pay by UPI or cash on WhatsApp or at our offline centre — we switch your Premium on right away."}</p>
        )}
        {!user && <p className="mt-4 text-center text-sm"><Link href="/login?next=/premium" className="font-semibold text-maroon underline">{hi ? "पहले लॉग इन करें" : "Log in first"}</Link></p>}

        <div className="card mx-auto mt-10 max-w-3xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-maroon-50/60 text-left">
              <tr><th className="px-4 py-3">{hi ? "फ़ीचर" : "Feature"}</th><th className="px-3 py-3 text-center">{hi ? "फ्री" : "Free"}</th><th className="px-3 py-3 text-center">⭐ Premium</th></tr>
            </thead>
            <tbody>
              {rows.map(([en, h, f, p]) => (
                <tr key={en} className="border-t border-maroon/5"><td className="px-4 py-3">{hi ? h : en}</td><td className="px-3 py-3 text-center text-stone-600">{f}</td><td className="px-3 py-3 text-center font-semibold text-maroon">{p}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mx-auto mt-4 max-w-2xl text-center text-xs text-stone-500">
          {hi ? `फ्री लिमिट रोज़ रात 12 बजे और टेस्ट लिमिट हर सोमवार रीसेट होती है।${plan?.trial_days ? ` नए छात्रों को ${plan.trial_days} दिन प्रीमियम फ्री।` : ""} GS Hub के पेड बैच के छात्रों को प्रीमियम फ्री — WhatsApp पर बताएँ।`
              : `Free limits reset every midnight (India time); the test limit resets every Monday.${plan?.trial_days ? ` New students get ${plan.trial_days} days of Premium free.` : ""} GS Hub paid-batch students get Premium free — message us on WhatsApp.`}
        </p>
      </div>
    </div>
  );
}
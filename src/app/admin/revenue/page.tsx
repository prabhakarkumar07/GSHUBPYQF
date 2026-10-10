"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { fetchApi } from "@/lib/api-client";

export default function AdminRevenuePage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [premiumUsers, setPremiumUsers] = useState(0);

  useEffect(() => {
    loadStats();
  }, [getToken]);

  const loadStats = async () => {
    try {
      const token = await getToken({ template: "supabase" });
      const data = await fetchApi("/admin/users", {}, token);
      const users = data.users || [];
      setTotalUsers(users.length);
      setPremiumUsers(users.filter((u: any) => u.subscription_tier === "premium").length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const stat = (label: string, value: string | number, hint: string = "", accent: boolean = false) => (
    <div className={`rounded-2xl p-4 ${accent ? "bg-maroon text-white" : "card"}`}>
      <div className={`text-xs font-medium uppercase tracking-wide ${accent ? "text-gold-300" : "text-stone-500"}`}>{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold ${accent ? "text-white" : "text-maroon"}`}>{value}</div>
      {hint && <div className={`mt-0.5 text-xs ${accent ? "text-white/70" : "text-stone-500"}`}>{hint}</div>}
    </div>
  );

  const bar = (p: number, cls: string) => (
    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
      <div className={`h-full rounded-full ${cls}`} style={{ width: `${p}%` }}></div>
    </div>
  );

  const months = [["May", 3.2], ["Jun", 5.9], ["Jul", 9.4], ["Aug", 14.1], ["Sep", 21.6], ["Oct", 27.8]];
  const max = 30;
  const pays = [
    ["R. K.", "Till Prelims", 499, "9 Oct, 12:41", "UPI"],
    ["S. P.", "Monthly", 99, "9 Oct, 11:02", "UPI"],
    ["A. K.", "6 Months", 399, "9 Oct, 09:15", "Card"],
    ["N. S.", "Till Prelims", 250, "8 Oct, 22:30", "UPI · GSHUB50"],
    ["M. R.", "Classroom", 0, "8 Oct, 18:05", "Code"],
    ["P. J.", "Monthly", 99, "8 Oct, 16:47", "UPI"]
  ];

  if (loading) return <div>Loading...</div>;

  const convRate = totalUsers ? ((premiumUsers / totalUsers) * 100).toFixed(1) : "0";

  return (
    <div className="container-page py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="h-display text-2xl">Revenue & Subscribers</h1>
      </div>
      
      <div className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
        Note: Some charts show static demo data until the real Payments table is built. Active Premium is real data!
      </div>
      
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat("Revenue — October", "₹27,840", "+29% vs September", true)}
        {stat("Active Premium", premiumUsers, `out of ${totalUsers} total users`)}
        {stat("Free → Premium", `${convRate}%`, "conversion rate")}
        {stat("Classroom codes used", "86", "of 120 issued")}
      </div>
      
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-5">
          <h2 className="mb-4 font-bold text-maroon">Monthly revenue (₹ thousand)</h2>
          <div className="flex h-44 items-end gap-3">
            {months.map(([m, v], i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold text-maroon">{v as number}k</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-maroon to-maroon-600" style={{ height: `${(100 * Number(v)) / max}%` }}></div>
                <span className="text-xs text-stone-500">{m as string}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="card p-5">
          <h2 className="mb-4 font-bold text-maroon">Plan split</h2>
          {[["Till Prelims · ₹499", 58, "bg-maroon"], ["6 Months · ₹399", 17, "bg-gold"], ["Monthly · ₹99", 25, "bg-stone-400"]].map(([l, p, c], i) => (
            <div key={i} className="mb-3">
              <div className="mb-1 flex justify-between text-sm">
                <span>{l as string}</span><b>{p as number}%</b>
              </div>
              {bar(Number(p), String(c))}
            </div>
          ))}
        </section>
      </div>
      
      <section className="card mt-5 overflow-x-auto">
        <div className="border-b border-maroon/10 px-5 py-3 font-bold text-maroon">Recent payments</div>
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-maroon-50/60 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="px-5 py-2">Student</th>
              <th className="px-3">Plan</th>
              <th className="px-3 text-right">Amount</th>
              <th className="px-3">Method</th>
              <th className="px-3">Time</th>
              <th className="px-5">Status</th>
            </tr>
          </thead>
          <tbody>
            {pays.map(([n, p, a, d, m], i) => (
              <tr key={i} className="border-t border-maroon/5">
                <td className="px-5 py-2.5 font-medium">{n}</td>
                <td className="px-3">{p}</td>
                <td className="px-3 text-right font-semibold">₹{a}</td>
                <td className="px-3 text-stone-600">{m}</td>
                <td className="px-3 text-stone-600">{d}</td>
                <td className="px-5"><span className="badge bg-green-100 text-green-800">Paid</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-bold text-maroon">Plans & free limits</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[["Monthly price (₹)", 99], ["6-month price (₹)", 399], ["Till-Prelims price (₹)", 499], ["Prelims date", "2027-03-15"], ["Free questions / day", 20], ["Free mocks / week", 1]].map(([l, v], i) => (
              <label key={i}>
                <span className="label !text-xs">{l as string}</span>
                <input className="input !py-2" defaultValue={String(v)} />
              </label>
            ))}
          </div>
          <button className="btn-primary mt-4">Save</button>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-bold text-maroon">Coupons & classroom codes</h2>
          <table className="w-full text-sm">
            <tbody>
              {[["GSHUB50", "50% off", "41 used"], ["DIWALI30", "30% off", "Expires 5 Nov"], ["Classroom batch codes", "100% off", "86 / 120 used"]].map(([c, d, u], i) => (
                <tr key={i} className="border-t border-maroon/5">
                  <td className="py-2.5 font-mono font-semibold text-maroon">{c as string}</td>
                  <td>{d as string}</td>
                  <td className="text-right text-stone-500">{u as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex gap-2">
            <input className="input !py-2" placeholder="New code" />
            <button className="btn-outline shrink-0 !py-2">+ Create</button>
          </div>
          <button className="btn-ghost mt-2 !px-0 text-xs">⬇ Generate 50 classroom codes (CSV)</button>
        </section>
      </div>
    </div>
  );
}

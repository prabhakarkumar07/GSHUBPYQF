"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { fetchApi } from "@/lib/api-client";
import { useClerkSupabase } from "@/lib/supabase/clerk-client";
import { useApp } from "@/components/providers";

export default function AdminRevenuePage() {
  const { getToken } = useAuth();
  const { taxonomy, reloadTaxonomy } = useApp();
  const supabaseClient = useClerkSupabase();
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [premiumUsers, setPremiumUsers] = useState(0);
  const [payments, setPayments] = useState<any[]>([]);

  // Settings state
  const [settingsForm, setSettingsForm] = useState(taxonomy.settings);

  useEffect(() => {
    loadStats();
  }, [getToken]);

  const loadStats = async () => {
    try {
      const token = await getToken() as string;
      const data = await fetchApi("/admin/users", {}, token);
      const users = data.users || [];
      setTotalUsers(users.length);
      setPremiumUsers(users.filter((u: any) => u.subscription_tier === "premium").length);
      
      const sb = supabaseClient;
      const { data: payData } = await sb!.from("payments").select("*, profiles(full_name)").order("created_at", { ascending: false }).limit(50);
      if (payData) setPayments(payData);
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const token = await getToken();
      await fetchApi("/admin/settings", { 
        method: "PUT",
        body: JSON.stringify({
          monthly_price: Number(settingsForm.monthly_price || 99),
          six_month_price: Number(settingsForm.six_month_price || 399),
          till_prelims_price: Number(settingsForm.till_prelims_price || 499),
          prelims_date: settingsForm.prelims_date || "2027-03-15",
          free_questions_per_day: Number(settingsForm.free_questions_per_day || 20),
          free_mocks_per_week: Number(settingsForm.free_mocks_per_week || 1)
        })
      }, token);
      alert("Settings saved!");
      reloadTaxonomy();
    } catch(e) {
      alert("Failed to save settings");
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

  if (loading) return <div>Loading...</div>;

  const convRate = totalUsers ? ((premiumUsers / totalUsers) * 100).toFixed(1) : "0";
  
  // Calculate dynamic stats
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  
  // Group by month
  const monthlyData: Record<string, number> = {};
  payments.forEach(p => {
    const d = new Date(p.created_at);
    const m = d.toLocaleString('default', { month: 'short' });
    monthlyData[m] = (monthlyData[m] || 0) + p.amount;
  });
  
  const months = Object.entries(monthlyData).slice(0, 6).reverse();
  const maxMonthly = months.length > 0 ? Math.max(...months.map(m => m[1])) : 1000;
  
  // Plan split
  const planCounts: Record<string, number> = {};
  payments.forEach(p => {
    planCounts[p.plan_name] = (planCounts[p.plan_name] || 0) + 1;
  });
  
  const totalPlans = payments.length || 1;
  const planSplits = Object.entries(planCounts).map(([name, count]) => {
    const pct = Math.round((count / totalPlans) * 100);
    return [name, pct, name.includes("Prelims") ? "bg-maroon" : name.includes("6") ? "bg-gold" : "bg-stone-400"];
  });

  return (
    <div className="container-page py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="h-display text-2xl">Revenue & Subscribers</h1>
      </div>
      
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat("Total Revenue", `₹${totalRevenue.toLocaleString()}`, `${payments.length} transactions`, true)}
        {stat("Active Premium", premiumUsers, `out of ${totalUsers} total users`)}
        {stat("Free → Premium", `${convRate}%`, "conversion rate")}
        {stat("Classroom codes used", "0", "Feature coming soon")}
      </div>
      
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-5">
          <h2 className="mb-4 font-bold text-maroon">Monthly revenue (₹)</h2>
          <div className="flex h-44 items-end gap-3">
            {months.length > 0 ? months.map(([m, v], i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold text-maroon">{v as number}</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-maroon to-maroon-600" style={{ height: `${Math.max(5, (100 * Number(v)) / maxMonthly)}%` }}></div>
                <span className="text-xs text-stone-500">{m as string}</span>
              </div>
            )) : <div className="text-sm text-stone-500">No revenue data yet.</div>}
          </div>
        </section>
        <section className="card p-5">
          <h2 className="mb-4 font-bold text-maroon">Plan split</h2>
          {planSplits.length > 0 ? planSplits.map(([l, p, c], i) => (
            <div key={i} className="mb-3">
              <div className="mb-1 flex justify-between text-sm">
                <span>{l as string}</span><b>{p as number}%</b>
              </div>
              {bar(Number(p), String(c))}
            </div>
          )) : <div className="text-sm text-stone-500">No plans purchased yet.</div>}
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
            {payments.length > 0 ? payments.map((p, i) => (
              <tr key={i} className="border-t border-maroon/5">
                <td className="px-5 py-2.5 font-medium">{p.profiles?.full_name || "Unknown"}</td>
                <td className="px-3">{p.plan_name}</td>
                <td className="px-3 text-right font-semibold">₹{p.amount}</td>
                <td className="px-3 text-stone-600">{p.method}</td>
                <td className="px-3 text-stone-600">{new Date(p.created_at).toLocaleString()}</td>
                <td className="px-5"><span className="badge bg-green-100 text-green-800">Paid</span></td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="px-5 py-4 text-center text-stone-500">No payments found.</td></tr>
            )}
          </tbody>
        </table>
      </section>
      
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-bold text-maroon">Plans & free limits</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Monthly price (₹)", "monthly_price", 99],
              ["6-month price (₹)", "six_month_price", 399],
              ["Till-Prelims price (₹)", "till_prelims_price", 499],
              ["Prelims date", "prelims_date", "2027-03-15"],
              ["Free questions / day", "free_questions_per_day", 20],
              ["Free mocks / week", "free_mocks_per_week", 1]
            ].map(([l, k, def], i) => (
              <label key={i}>
                <span className="label !text-xs">{l as string}</span>
                <input 
                  className="input !py-2" 
                  value={String((settingsForm as any)[k as string] ?? def)} 
                  onChange={(e) => setSettingsForm({...settingsForm, [k as string]: e.target.value})}
                />
              </label>
            ))}
          </div>
          <button className="btn-primary mt-4" onClick={handleSaveSettings}>Save</button>
        </section>
        
        {/* We can hide coupons for now since it's mock data */}
        <section className="card p-5 opacity-50 pointer-events-none">
          <h2 className="mb-3 font-bold text-maroon">Coupons & classroom codes (Coming Soon)</h2>
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
            <input className="input !py-2" placeholder="New code" disabled />
            <button className="btn-outline shrink-0 !py-2" disabled>+ Create</button>
          </div>
        </section>
      </div>
    </div>
  );
}

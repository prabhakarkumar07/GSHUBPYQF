"use client";
import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { fetchApi } from "@/lib/api-client";
import { useApp } from "@/components/providers";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PricingPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { authReady, taxonomy } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "six_months" | "till_prelims">("till_prelims");

  const settings = taxonomy.settings;
  const prices = {
    monthly: settings.monthly_price || 99,
    six_months: settings.six_month_price || 399,
    till_prelims: settings.till_prelims_price || 499,
  };
  
  const planNames = {
    monthly: "Monthly Plan",
    six_months: "6 Months Plan",
    till_prelims: "Till Prelims Plan",
  };

  const handleUpgrade = async () => {
    if (!authReady || !user) {
      router.push("/login?redirect_url=/pricing");
      return;
    }

    setLoading(true);
    try {
      const amount = prices[selectedPlan] * 100; // Razorpay expects paise
      const planName = planNames[selectedPlan];
      
      const token = await getToken({ template: "supabase" });
      const orderData = await fetchApi("/razorpay/create-order", { 
        method: "POST", 
        body: JSON.stringify({ amount, plan_name: planName })
      }, token);

      const options = {
        key: orderData.keyId,
        amount: orderData.amount, // from backend
        currency: orderData.currency,
        name: "GS Hub BPSC Portal",
        description: planName,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            await fetchApi("/razorpay/verify-payment", {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: prices[selectedPlan],
                plan_name: planName,
                method: "Online"
              })
            }, token);
            alert("Payment successful! Your account has been upgraded to Premium.");
            window.location.href = "/dashboard";
          } catch(e) {
            alert("Payment verification failed! Please contact support.");
          }
        },
        prefill: {
          name: user?.fullName || "Student",
          email: user?.primaryEmailAddress?.emailAddress || "",
        },
        theme: {
          color: "#722F37", // Maroon branding
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        alert("Payment failed: " + response.error.description);
      });
      rzp.open();
    } catch (error: any) {
      alert("Error initializing payment: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page py-16">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="mx-auto max-w-4xl text-center">
        <h1 className="h-display text-4xl text-maroon sm:text-5xl">Unlock Premium BPSC Prep</h1>
        <p className="mt-4 text-lg text-stone-600">
          Get access to high-yield current affairs, exclusive test series, and advanced analytics.
        </p>

        <div className="mt-12 grid gap-8 md:grid-cols-2 md:items-start">
          {/* Free Tier */}
          <div className="card flex flex-col items-center p-8 border-2 border-transparent hover:border-maroon/10 transition-colors h-full">
            <h2 className="text-2xl font-bold text-stone-800">Free Tier</h2>
            <div className="mt-4 text-4xl font-extrabold text-stone-900">₹0</div>
            <p className="mt-2 text-sm text-stone-500">Forever Free</p>
            
            <ul className="mt-8 space-y-4 text-left w-full text-stone-600">
              <li className="flex items-center gap-3"><span className="text-green-600">✓</span> Access to all BPSC PYQs</li>
              <li className="flex items-center gap-3"><span className="text-green-600">✓</span> Basic Subject/Topic filtering</li>
              <li className="flex items-center gap-3"><span className="text-green-600">✓</span> {settings.free_questions_per_day || 20} Questions per day</li>
              <li className="flex items-center gap-3"><span className="text-green-600">✓</span> {settings.free_mocks_per_week || 1} Free Mock per week</li>
              <li className="flex items-center gap-3"><span className="text-green-600">✓</span> Mistake Notebook (Basic)</li>
            </ul>

            <button className="btn-outline mt-auto pt-8 w-full cursor-default opacity-50" disabled>
              {user ? "Current Plan" : "Included"}
            </button>
          </div>

          {/* Premium Tier */}
          <div className="card flex flex-col items-center p-8 border-2 border-gold bg-gold-50/30 relative shadow-xl transform md:scale-105 h-full">
            <div className="absolute top-0 right-0 bg-gold text-maroon-900 text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl uppercase tracking-wider">
              Recommended
            </div>
            <h2 className="text-2xl font-bold text-maroon">Pro Plan</h2>
            
            <div className="mt-6 flex flex-col w-full gap-2 text-left">
              <label className={`border rounded-lg p-3 cursor-pointer flex justify-between items-center transition-colors ${selectedPlan === "till_prelims" ? "bg-white border-maroon ring-1 ring-maroon" : "bg-white/50 border-stone-200 hover:border-maroon/50"}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="plan" checked={selectedPlan === "till_prelims"} onChange={() => setSelectedPlan("till_prelims")} className="accent-maroon" />
                  <div>
                    <div className="font-bold text-maroon">Till Prelims</div>
                    <div className="text-xs text-stone-500">Valid till {settings.prelims_date || "2027-03-15"}</div>
                  </div>
                </div>
                <div className="font-extrabold text-lg text-maroon-900">₹{prices.till_prelims}</div>
              </label>

              <label className={`border rounded-lg p-3 cursor-pointer flex justify-between items-center transition-colors ${selectedPlan === "six_months" ? "bg-white border-maroon ring-1 ring-maroon" : "bg-white/50 border-stone-200 hover:border-maroon/50"}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="plan" checked={selectedPlan === "six_months"} onChange={() => setSelectedPlan("six_months")} className="accent-maroon" />
                  <div className="font-bold text-maroon">6 Months</div>
                </div>
                <div className="font-extrabold text-lg text-maroon-900">₹{prices.six_months}</div>
              </label>

              <label className={`border rounded-lg p-3 cursor-pointer flex justify-between items-center transition-colors ${selectedPlan === "monthly" ? "bg-white border-maroon ring-1 ring-maroon" : "bg-white/50 border-stone-200 hover:border-maroon/50"}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="plan" checked={selectedPlan === "monthly"} onChange={() => setSelectedPlan("monthly")} className="accent-maroon" />
                  <div className="font-bold text-maroon">Monthly</div>
                </div>
                <div className="font-extrabold text-lg text-maroon-900">₹{prices.monthly}</div>
              </label>
            </div>
            
            <ul className="mt-8 space-y-4 text-left w-full text-maroon-900">
              <li className="flex items-center gap-3"><span className="text-gold">★</span> <b>Unlimited questions</b> (No daily limit)</li>
              <li className="flex items-center gap-3"><span className="text-gold">★</span> <b>Unlimited Full Mocks</b></li>
              <li className="flex items-center gap-3"><span className="text-gold">★</span> <b>Topic-level Heatmaps</b></li>
              <li className="flex items-center gap-3"><span className="text-gold">★</span> <b>Smart Mistake Quiz</b></li>
              <li className="flex items-center gap-3"><span className="text-gold">★</span> Peer comparison analytics</li>
            </ul>

            <button 
              className="btn-primary mt-8 w-full shadow-lg hover:shadow-xl transition-all"
              onClick={handleUpgrade}
              disabled={loading}
            >
              {loading ? "Initializing..." : `Pay ₹${prices[selectedPlan]} securely`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

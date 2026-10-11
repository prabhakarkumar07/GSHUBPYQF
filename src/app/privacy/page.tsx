import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for GS Hub Civil Services Classes BPSC PYQ Portal.",
};

export default function PrivacyPage() {
  return (
    <div className="container-page max-w-4xl py-12 text-stone-800">
      <h1 className="h-display text-3xl font-bold text-maroon sm:text-4xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-stone-500">Effective Date: October 12, 2026 | Last Updated: October 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-stone-700">
        <section>
          <h2 className="text-xl font-bold text-maroon">1. Introduction</h2>
          <p className="mt-2">
            GS Hub Civil Services Classes (&ldquo;GS Hub&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), located at Rajendra Nagar, Patna, Bihar, operates the GS Hub BPSC PYQ Portal (&ldquo;the Service&rdquo;). We are committed to protecting your privacy in compliance with applicable laws, including the Digital Personal Data Protection Act, 2023 (DPDPA) and the Information Technology Act, 2000.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-maroon">2. Personal Data We Collect</h2>
          <p className="mt-2">We collect only information necessary to deliver and improve our educational services:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li><strong>Identity &amp; Contact Data:</strong> Name, email address, and mobile phone number (collected during signup or profile completion).</li>
            <li><strong>Educational Information:</strong> Targeted examination (e.g., 70th/71st BPSC Prelims), language preference (Hindi or English).</li>
            <li><strong>Academic Performance Data:</strong> Quiz attempts, responses, scores, bookmarks, mistake notebook entries, and accuracy statistics.</li>
            <li><strong>Transaction Data:</strong> Razorpay order IDs and payment status (we do not store your credit card, debit card, UPI PINs, or net banking credentials; all payment processing is handled securely by Razorpay).</li>
            <li><strong>Technical Data:</strong> Browser type, device characteristics, and IP address for session security and anti-fraud monitoring.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-maroon">3. Purpose of Data Processing</h2>
          <p className="mt-2">We use your data solely to:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Create and authenticate your user account.</li>
            <li>Provide personalized learning analytics (Memory Heat Map, Mistake Notebook, accuracy trends).</li>
            <li>Process payments and activate premium test subscriptions.</li>
            <li>Communicate critical account notices, receipts, and customer support resolutions.</li>
            <li>Ensure platform security and prevent unauthorized access or cheating in live mock tests.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-maroon">4. Third-Party Service Providers</h2>
          <p className="mt-2">We share personal data only with trusted infrastructure providers bound by confidentiality and security obligations:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li><strong>Clerk:</strong> Identity management and secure user authentication.</li>
            <li><strong>Supabase:</strong> Encrypted cloud database and backend infrastructure.</li>
            <li><strong>Razorpay:</strong> RBI-licensed payment gateway for processing payments.</li>
          </ul>
          <p className="mt-2">We do not sell, rent, or trade your personal data to advertisers or third-party marketing brokers.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-maroon">5. Data Retention &amp; Security</h2>
          <p className="mt-2">
            Your data is stored securely in encrypted databases and retained as long as your account is active. Transaction records are maintained for the statutory period required under Indian financial and tax laws.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-maroon">6. Your Rights &amp; Data Deletion Requests</h2>
          <p className="mt-2">
            You have the right to access, rectify, export, or permanently delete your personal information. If you wish to delete your account and all associated test history, you may submit a request by contacting us at:
          </p>
          <div className="mt-3 rounded-xl bg-stone-100 p-4">
            <p className="font-semibold text-stone-900">GS Hub Privacy &amp; Data Protection</p>
            <p className="text-stone-700">Email: <a href="mailto:support@gshubsite.com" className="text-maroon underline">support@gshubsite.com</a></p>
            <p className="text-stone-700">Phone: +91 8287417384</p>
            <p className="text-stone-700">Address: Rajendra Nagar, Patna, Bihar, 800016</p>
          </div>
          <p className="mt-2">Requests are verified and processed within 30 business days.</p>
        </section>
      </div>
    </div>
  );
}

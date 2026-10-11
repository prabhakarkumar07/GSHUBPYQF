import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and Conditions of GS Hub Civil Services Classes BPSC PYQ Portal.",
};

export default function TermsPage() {
  return (
    <div className="container-page max-w-4xl py-12 text-stone-800">
      <h1 className="h-display text-3xl font-bold text-maroon sm:text-4xl">Terms of Service</h1>
      <p className="mt-2 text-sm text-stone-500">Effective Date: October 12, 2026 | Last Updated: October 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-stone-700">
        <section>
          <h2 className="text-xl font-bold text-maroon">1. Acceptance of Terms</h2>
          <p className="mt-2">
            By registering, accessing, or using the GS Hub BPSC PYQ Portal (&ldquo;the Platform&rdquo;), operated by GS Hub Civil Services Classes (&ldquo;GS Hub&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, please refrain from using our services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-maroon">2. User Accounts &amp; Security</h2>
          <p className="mt-2">
            You must provide accurate, current, and complete information when registering an account. You are responsible for safeguarding your login credentials and for all activities conducted through your account. You agree not to share, resell, or distribute your account access to others.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-maroon">3. Educational Content &amp; Intellectual Property</h2>
          <p className="mt-2">
            Previous Year Questions (PYQs) published by the Bihar Public Service Commission (BPSC) are official examination questions presented for fair-use academic preparation.
          </p>
          <p className="mt-2">
            All proprietary explanations, detailed solutions, curated test series questions, memory heatmaps, Mistake Notebook algorithms, logos, and UI designs are the intellectual property of GS Hub Civil Services Classes. Unauthorized scraping, bulk copying, commercial redistribution, or publication of our solutions is strictly prohibited.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-maroon">4. Subscriptions &amp; Paid Plans</h2>
          <p className="mt-2">
            Certain features, including unlimited mock tests and advanced analytics, are available through paid subscription tiers (&ldquo;Pro Plan&rdquo;). Prices are clearly listed on our Pricing page in Indian Rupees (INR) and are inclusive of all applicable statutory taxes unless stated otherwise.
          </p>
          <p className="mt-2">
            Plan durations (e.g. Monthly, 6 Months, or Till Prelims Exam) represent fixed subscription periods and terminate automatically at the end of the specified cycle.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-maroon">5. Prohibited Conduct</h2>
          <p className="mt-2">Users agree not to:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Engage in automated scraping, bot crawling, or denial-of-service attempts.</li>
            <li>Submit malicious scripts, exploit vulnerabilities, or bypass rate limits.</li>
            <li>Use the feedback or communication forms for abuse, spam, or defamatory remarks.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-maroon">6. Disclaimer of Warranties &amp; Limitation of Liability</h2>
          <p className="mt-2">
            Our portal is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. While GS Hub strives to ensure high factual accuracy in all question explanations and exam keys, we do not guarantee admission, selection, or specific rank in the BPSC civil services examinations. To the maximum extent permitted by Indian law, GS Hub shall not be liable for indirect, incidental, or consequential damages.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-maroon">7. Governing Law &amp; Jurisdiction</h2>
          <p className="mt-2">
            These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or related to these terms shall be subject to the exclusive jurisdiction of the courts located in Patna, Bihar.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-maroon">8. Contact Information</h2>
          <p className="mt-2">
            GS Hub Civil Services Classes<br />
            Rajendra Nagar, Patna, Bihar, 800016<br />
            Phone: +91 8287417384<br />
            Website: https://gshubsite.com
          </p>
        </section>
      </div>
    </div>
  );
}

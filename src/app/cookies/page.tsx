import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Cookie Policy for GS Hub Civil Services Classes BPSC PYQ Portal.",
};

export default function CookiePolicyPage() {
  return (
    <div className="container-page max-w-4xl py-12 text-stone-800">
      <h1 className="h-display text-3xl font-bold text-maroon sm:text-4xl">Cookie &amp; Local Storage Policy</h1>
      <p className="mt-2 text-sm text-stone-500">Effective Date: October 12, 2026 | Last Updated: October 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-stone-700">
        <section>
          <h2 className="text-xl font-bold text-maroon">1. What Are Cookies and Local Storage?</h2>
          <p className="mt-2">
            Cookies and browser Local Storage are small files stored on your computer or mobile device when you visit a website. They allow the website to remember your actions and preferences over a period of time, ensuring a seamless learning experience.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-maroon">2. How We Use Them</h2>
          <p className="mt-2">GS Hub BPSC Portal uses cookies and local storage strictly for functional and educational purposes:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li><strong>Authentication &amp; Session Management:</strong> Strictly necessary cookies managed by Clerk and Supabase to keep you securely signed in to your account across pages.</li>
            <li><strong>Language Preferences:</strong> Local storage key <code>gshub_lang</code> remembers whether you prefer studying in Hindi or English so you do not need to switch on every page load.</li>
            <li><strong>Taxonomy &amp; Exam Cache:</strong> Local storage key <code>gshub_taxonomy_v1</code> stores subjects, topics, and syllabus hierarchy locally to ensure instant page navigation on slow network connections.</li>
            <li><strong>Quiz Session State:</strong> Local storage stores in-progress quiz responses so your work is not lost if your internet connection drops midway through an examination.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-maroon">3. Third-Party Tracking &amp; Advertising</h2>
          <p className="mt-2">
            We do <strong>not</strong> use third-party behavioral advertising cookies, ad networks, or data brokers. The third-party scripts present on our portal are strictly operational (Razorpay for payment modal checkout and Clerk for authentication tokens).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-maroon">4. How to Manage Cookies</h2>
          <p className="mt-2">
            You can control or disable cookies through your browser settings. However, disabling strictly necessary cookies will prevent you from signing in and saving your quiz progress.
          </p>
        </section>
      </div>
    </div>
  );
}

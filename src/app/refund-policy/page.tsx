import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: "Refund and Cancellation Policy for GS Hub Civil Services Classes BPSC PYQ Portal.",
};

export default function RefundPolicyPage() {
  return (
    <div className="container-page max-w-4xl py-12 text-stone-800">
      <h1 className="h-display text-3xl font-bold text-maroon sm:text-4xl">Refund &amp; Cancellation Policy</h1>
      <p className="mt-2 text-sm text-stone-500">Effective Date: October 12, 2026 | Last Updated: October 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-stone-700">
        <section>
          <h2 className="text-xl font-bold text-maroon">1. Digital Educational Services</h2>
          <p className="mt-2">
            GS Hub Civil Services Classes provides digital access to test series, questions, analytical tools, and mock examinations (&ldquo;Digital Products&rdquo;). Access to digital study materials and premium portal features is provisioned immediately upon successful completion of payment via Razorpay.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-maroon">2. Refund Eligibility &amp; Exceptions</h2>
          <p className="mt-2">
            Because digital access to the full test bank and answer explanations is activated immediately upon purchase, subscription fees are generally non-refundable once content has been accessed.
          </p>
          <p className="mt-2">However, full refunds will be issued under the following circumstances:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li><strong>Duplicate Charges:</strong> In the event of technical failure resulting in duplicate debits for the same subscription order, the excess amount will be refunded automatically or upon notification.</li>
            <li><strong>Payment Debited but Account Not Upgraded:</strong> If your bank account or payment method was successfully debited but our system failed to upgrade your account, and our technical support team cannot resolve the access within 48 hours, a 100% refund will be processed immediately.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-maroon">3. Cancellation Process</h2>
          <p className="mt-2">
            Our subscriptions (Monthly, 6 Months, or Till Prelims) are one-time payments for a fixed term and <strong>do not automatically renew</strong>. There are no hidden recurring charges or cancellation penalties. Your access continues until the end of your prepaid period.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-maroon">4. Refund Request Procedure &amp; Timelines</h2>
          <p className="mt-2">
            To request a refund for duplicate or failed transactions, please contact us within 7 days of the transaction date with the following details:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Registered Email Address and Mobile Number</li>
            <li>Razorpay Payment ID / Transaction Reference</li>
            <li>Proof of deduction (bank statement or screenshot)</li>
          </ul>
          <p className="mt-3">
            Contact our payment helpdesk:<br />
            <strong>Email:</strong> <a href="mailto:support@gshubsite.com" className="text-maroon underline">support@gshubsite.com</a><br />
            <strong>Phone / WhatsApp:</strong> +91 8287417384
          </p>
          <p className="mt-2">
            Once approved, refunds are credited back to the original source account (UPI, card, or net banking) within <strong>5 to 7 business days</strong> in accordance with banking guidelines.
          </p>
        </section>
      </div>
    </div>
  );
}

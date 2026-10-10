import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { AppProvider } from "@/components/providers";
import { Header } from "@/components/Header";
import { PaywallModal } from "@/components/PaywallModal";
import { Footer } from "@/components/Footer";
import { MobileTabs } from "@/components/MobileTabs";
import { FeedbackButton } from "@/components/FeedbackButton";

export const metadata: Metadata = {
  title: { default: "GS Hub BPSC PYQ Portal â€” Free BPSC Prelims Practice", template: "%s Â· GS Hub BPSC PYQ Portal" },
  description: "Solve BPSC Prelims previous year questions topic-wise in Hindi & English, with detailed solutions, a personal Mistake Notebook and accuracy heat map. Free, by GS Hub Civil Services Classes, Patna.",
  applicationName: "GS Hub BPSC PYQ Portal",
};

export const viewport: Viewport = { themeColor: "#6B0F1A", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Noto+Serif:wght@600;700&family=Noto+Serif+Devanagari:wght@600;700&display=swap"
          />
        </head>
        <body className="min-h-screen font-sans antialiased" suppressHydrationWarning>
          <AppProvider>
            <Header />
            <main className="min-h-[60vh]">{children}</main>
            <Footer />
            <MobileTabs />
            <FeedbackButton />
          <PaywallModal />
        </AppProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

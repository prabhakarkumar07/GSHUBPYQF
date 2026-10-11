import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="container-page flex justify-center py-10 sm:py-16">
      <SignIn
        signUpUrl="/signup"
        appearance={{
          variables: {
            colorPrimary: "#6B0F1A",
            colorBackground: "#ffffff",
          },
          elements: {
            card: "border border-maroon/10 shadow-[0_4px_24px_rgba(107,15,26,0.08)] rounded-2xl",
            formButtonPrimary: "bg-maroon hover:bg-maroon-600 text-white shadow-md",
            footerActionLink: "text-maroon hover:text-maroon-800",
          },
        }}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sb = await getServerSupabase();
  if (!sb) {
    return <div className="container-page py-16 text-center text-stone-600">Supabase is not configured — see README.</div>;
  }
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="h-display text-2xl">Admins only</h1>
        <p className="mt-2 text-stone-600">Ask a GS Hub administrator to grant your account the admin role (see README → “Make yourself admin”).</p>
      </div>
    );
  }
  return (
    <div className="container-page py-6">
      <AdminNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}

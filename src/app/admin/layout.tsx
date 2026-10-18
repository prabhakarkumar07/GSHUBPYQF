import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { AdminNav } from "./AdminNav";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    return <div className="container-page py-16 text-center text-stone-600">Supabase is not configured — see README.</div>;
  }

  const { userId, getToken } = await auth();
  if (!userId) redirect("/login?next=/admin");

  const token = await getToken({ template: "supabase" });
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
  const { data: profile } = await sb.from("profiles").select("role").eq("id", userId).maybeSingle();

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

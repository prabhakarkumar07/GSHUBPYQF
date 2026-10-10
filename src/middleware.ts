import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/env";

// Pages that need a logged-in student (quizzes included).
const PROTECTED = ["/practice", "/quiz", "/result", "/dashboard", "/notebook", "/heatmap", "/bookmarks", "/admin"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refreshes the auth token if needed.
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return response;
}

// Only pages that need a login run this check — public pages (home, about,
// login) load without an extra trip to Supabase.
export const config = {
  matcher: [
    "/practice/:path*", "/quiz/:path*", "/result/:path*", "/dashboard/:path*",
    "/notebook/:path*", "/heatmap/:path*", "/bookmarks/:path*", "/admin/:path*",
  ],
};

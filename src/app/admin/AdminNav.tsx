"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Analytics" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/live-exams", label: "Live Exams" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/upload", label: "Bulk upload" },
  { href: "/admin/taxonomy", label: "Subjects, topics & exams" },
  { href: "/admin/settings", label: "Marking & settings" },
  { href: "/admin/feedback", label: "Feedback" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <div className="rounded-2xl bg-maroon-900 p-1.5">
      <nav className="no-scrollbar flex gap-1 overflow-x-auto">
        {LINKS.map((l) => {
          const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium ${active ? "bg-gold text-maroon-900" : "text-white/80 hover:bg-white/10"}`}>
              {l.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

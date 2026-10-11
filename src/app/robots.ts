import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/auth/callback", "/api/"],
    },
    sitemap: "https://gshubsite.com/sitemap.xml",
  };
}

import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register", "/forgot-password"],
        disallow: ["/admin", "/admin/", "/api/", "/dashboard", "/apply", "/my-applications", "/profile", "/reset-password", "/verify-email"],
      },
    ],
    sitemap: `${env.appUrl}/sitemap.xml`,
  };
}

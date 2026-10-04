import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cutato-web.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/portal/salon/apply", "/portal/barber/apply"],
      disallow: ["/api/", "/admin/", "/portal/", "/bookings", "/auth/", "/reset-password"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cutato-web.vercel.app";

const publicRoutes = [
  "",
  "/book",
  "/book-ai",
  "/hairstyle-advisor",
  "/login",
  "/signup",
  "/portal/salon/apply",
  "/portal/barber/apply",
  "/impressum",
  "/privacy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.6,
  }));
}

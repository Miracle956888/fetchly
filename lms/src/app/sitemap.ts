import type { MetadataRoute } from "next";
import { listPublishedCourses } from "@/services/course.service";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { rows } = await listPublishedCourses({ sort: "newest", page: 1, perPage: 100 });
  return [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/courses`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/categories`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/faq`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/contact`, changeFrequency: "monthly", priority: 0.5 },
    ...rows.map((c) => ({
      url: `${BASE}/courses/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}

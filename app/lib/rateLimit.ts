import "server-only";

import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

// Fixed-window limiter kept in memory. It protects each server instance from
// bursts and runaway AI costs; for a strict global limit across serverless
// instances, back this with a shared store such as Upstash Redis.
export function rateLimit(
  request: Request,
  name: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): NextResponse | null {
  const now = Date.now();
  const key = `${name}:${clientIp(request)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return null;
  }

  bucket.count += 1;
  if (bucket.count <= limit) return null;

  const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
  return NextResponse.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

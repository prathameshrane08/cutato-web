import { NextResponse } from "next/server";

import { adminSupabase } from "@/app/lib/supabase/serverAuth";
import { rateLimit } from "@/app/lib/rateLimit";

export const dynamic = "force-dynamic";

// Health check. Vercel Cron calls this daily (see vercel.json); the database
// query also counts as activity, which keeps a free Supabase project from
// being auto-paused after a week without traffic.
export async function GET(request: Request) {
  const limited = rateLimit(request, "health", { limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const { error } = await adminSupabase
    .from("salons")
    .select("id", { head: true, count: "exact" })
    .limit(1);

  if (error) {
    console.error("HEALTH CHECK DATABASE ERROR:", error);
    return NextResponse.json({ ok: false, database: "unreachable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, database: "ok" });
}

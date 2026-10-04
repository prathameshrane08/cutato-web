"use client";

import { supabase } from "@/app/lib/supabase";

// fetch() that forwards the signed-in user's Supabase access token, for API
// routes that authorize callers with requireUser/requireProfile/requireAdmin.
export async function authorizedFetch(input: string, init: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return fetch(input, { ...init, headers });
}

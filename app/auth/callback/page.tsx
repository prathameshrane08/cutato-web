"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import WebShell from "@/app/Components/WebShell";
import { signIn } from "@/app/Components/auth";

import { supabase } from "@/app/lib/supabase";
import { getProfileByUserId } from "@/app/lib/profilesSupabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function finishLogin() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session?.user) {
          console.error("OAuth callback failed:", error);
          router.replace("/login");
          return;
        }

        const user = session.user;

        const profile = await getProfileByUserId(user.id);

        signIn({
          email: user.email || "customer@cutato.com",
          role: profile?.role || "customer",
          name:
            profile?.name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Customer",
          barberId: profile?.barber_id || undefined,
        });

        if (profile?.role === "salon") {
          router.replace("/portal/salon");
          return;
        }

        if (profile?.role === "barber") {
          router.replace("/portal/barber");
          return;
        }

        router.replace("/");
      } catch (err) {
        console.error("Auth callback error:", err);
        router.replace("/login");
      }
    }

    finishLogin();
  }, [router]);

  return (
    <WebShell
      title="Signing you in"
      subtitle="Completing secure authentication..."
    >
      <div className="mx-auto max-w-md rounded-[32px] border border-black/10 bg-white p-8 shadow-sm">
        <div className="text-lg font-black">
          Completing login...
        </div>

        <div className="mt-3 text-sm text-neutral-500">
          Please wait while we securely sign you in.
        </div>
      </div>
    </WebShell>
  );
}
"use client";

import Link from "next/link";
import {
  useState,
} from "react";

import {
  Building2,
  Mail,
  Lock,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/app/lib/supabase/client";

import {
  signIn,
} from "@/app/Components/auth";

import WebShell from "@/app/Components/WebShell";

export default function SalonLoginPage() {
  const [email, setEmail] =
    useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const router =
    useRouter();

  const supabase =
    createClient();

  async function login() {
    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !cleanEmail ||
      !password
    ) {
      alert(
        "Please enter your email and password."
      );

      return;
    }

    try {
      setLoading(true);

      //--------------------------------------------
      // Supabase login
      //--------------------------------------------

      const {
        data: loginData,
        error: loginError,
      } =
        await supabase.auth.signInWithPassword(
          {
            email:
              cleanEmail,

            password,
          }
        );

      if (loginError) {
        throw new Error(
          loginError.message
        );
      }

      const user =
        loginData.user;

      if (!user) {
        throw new Error(
          "Login failed."
        );
      }

      //--------------------------------------------
      // Load CUTATO profile
      //--------------------------------------------

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          `
          id,
          email,
          role,
          name,
          barber_id,
          salon_id
          `
        )
        .eq(
          "id",
          user.id
        )
        .single();

      if (
        profileError ||
        !profile
      ) {
        await supabase.auth.signOut();

        throw new Error(
          "Your Cutato profile could not be found."
        );
      }

      //--------------------------------------------
      // Validate salon role
      //--------------------------------------------

      if (
        profile.role !==
        "salon"
      ) {
        await supabase.auth.signOut();

        throw new Error(
          "This account is not a salon account."
        );
      }

      //--------------------------------------------
      // Salon must be linked
      //--------------------------------------------

      if (
        !profile.salon_id
      ) {
        await supabase.auth.signOut();

        throw new Error(
          "Your account is not linked to a salon profile yet."
        );
      }

      //--------------------------------------------
      // Save CUTATO local auth
      //--------------------------------------------

      signIn({
        name:
          profile.name ||
          cleanEmail.split(
            "@"
          )[0],

        email:
          profile.email ||
          cleanEmail,

        role:
          "salon",

        salonId:
          profile.salon_id,

        supabaseUserId:
          user.id,
      });

      //--------------------------------------------
      // Dashboard
      //--------------------------------------------

      router.replace(
        "/portal/salon"
      );

      router.refresh();
    } catch (error) {
      console.error(
        "SALON LOGIN ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Login failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <WebShell
      title="Salon portal"
      subtitle="Login to manage your salon operations."
    >
      <div className="mx-auto max-w-md">
        <div className="rounded-[36px] border border-black/10 bg-white p-8 shadow-[0_20px_70px_rgba(0,0,0,0.07)]">
          <div className="inline-flex rounded-2xl bg-[#ff355d]/10 p-4 text-[#ff355d]">
            <Building2 />
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-[-0.05em]">
            Salon login
          </h1>

          <p className="mt-3 text-sm leading-6 text-neutral-500">
            Access your salon
            dashboard, staff
            management and analytics.
          </p>

          <div className="mt-8 grid gap-5">
            <div className="flex h-14 items-center gap-3 rounded-2xl border border-black/10 bg-neutral-50 px-5">
              <Mail
                size={18}
                className="text-neutral-400"
              />

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    void login();
                  }
                }}
                autoComplete="email"
                placeholder="Business email"
                className="h-full w-full bg-transparent text-sm font-semibold outline-none"
              />
            </div>

            <div className="flex h-14 items-center gap-3 rounded-2xl border border-black/10 bg-neutral-50 px-5">
              <Lock
                size={18}
                className="text-neutral-400"
              />

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    void login();
                  }
                }}
                autoComplete="current-password"
                placeholder="Password"
                className="h-full w-full bg-transparent text-sm font-semibold outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                void login()
              }
              disabled={
                loading
              }
              className="inline-flex h-14 items-center justify-center rounded-full bg-[#ff355d] px-6 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:bg-[#ff1f4c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </button>

            <Link
              href="/portal/salon/apply"
              className="text-center text-sm font-bold text-[#ff355d]"
            >
              Register your salon
            </Link>
          </div>
        </div>
      </div>
    </WebShell>
  );
}
"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  CalendarCheck,
  Eye,
  EyeOff,
  Lock,
  MapPin,
  Scissors,
  Sparkles,
} from "lucide-react";

import WebShell from "@/app/Components/WebShell";

import {
  getAuthUser,
  signIn,
  type UserRole,
} from "@/app/Components/auth";

import {
  signInCustomer,
} from "@/app/lib/authSupabase";

import {
  createClient,
} from "@/app/lib/supabase/client";

//==================================================
// HELPERS
//==================================================

function isEmail(
  value: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

function getRoleDestination(
  role: UserRole
) {
  if (role === "salon") {
    return "/portal/salon";
  }

  if (role === "barber") {
    return "/portal/barber";
  }

  return "/";
}

//==================================================
// PAGE
//==================================================

export default function LoginPage() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const requestedNext =
    searchParams.get("next");

  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [remember, setRemember] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(
      null
    );

  const [loading, setLoading] =
    useState(false);

  //------------------------------------------------
  // Existing CUTATO login
  //------------------------------------------------

  useEffect(() => {
    const existingUser =
      getAuthUser();

    if (!existingUser) {
      return;
    }

    const destination =
      getRoleDestination(
        existingUser.role
      );

    router.replace(
      destination
    );
  }, [router]);

  //------------------------------------------------
  // Validation
  //------------------------------------------------

  const emailOk =
    useMemo(
      () =>
        isEmail(email),
      [email]
    );

  const passwordOk =
    useMemo(
      () =>
        password.length >= 4,
      [password]
    );

  const canSubmit =
    emailOk &&
    passwordOk &&
    !loading;

  //------------------------------------------------
  // Login
  //------------------------------------------------

  async function onSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setErrorMessage(null);

    if (!emailOk) {
      setErrorMessage(
        "Please enter a valid email."
      );

      return;
    }

    if (!passwordOk) {
      setErrorMessage(
        "Password must be at least 4 characters."
      );

      return;
    }

    try {
      setLoading(true);

      //--------------------------------------------
      // 1. Supabase Auth
      //--------------------------------------------

      const {
        data,
        error,
      } =
        await signInCustomer(
          email
            .trim()
            .toLowerCase(),

          password
        );

      if (error) {
        setErrorMessage(
          error.message
        );

        return;
      }

      const authUser =
        data.user;

      if (
        !authUser?.id ||
        !authUser.email
      ) {
        setErrorMessage(
          "Login failed. No user was returned."
        );

        return;
      }

      //--------------------------------------------
      // 2. Load FULL Cutato profile
      //--------------------------------------------

      const {
        data: profile,
        error:
          profileError,
      } =
        await supabase
          .from(
            "profiles"
          )
          .select(
            `
            id,
            name,
            email,
            role,
            barber_id,
            salon_id
            `
          )
          .eq(
            "id",
            authUser.id
          )
          .maybeSingle();

      if (
        profileError
      ) {
        console.error(
          "LOGIN PROFILE ERROR:",
          profileError
        );

        setErrorMessage(
          `Could not load your Cutato profile: ${profileError.message}`
        );

        return;
      }

      if (!profile) {
        setErrorMessage(
          "Your account exists, but no Cutato profile was found."
        );

        return;
      }

      //--------------------------------------------
      // 3. Validate role
      //--------------------------------------------

      const role =
        profile.role as
          | UserRole
          | null;

      if (
        role !==
          "customer" &&
        role !==
          "barber" &&
        role !==
          "salon"
      ) {
        setErrorMessage(
          "This account has an invalid Cutato role."
        );

        return;
      }

      //--------------------------------------------
      // 4. Validate portal links
      //--------------------------------------------

      if (
        role ===
          "salon" &&
        !profile.salon_id
      ) {
        setErrorMessage(
          "This salon account is not linked to a salon."
        );

        return;
      }

      if (
        role ===
          "barber" &&
        !profile.barber_id
      ) {
        setErrorMessage(
          "This barber account is not linked to a barber profile."
        );

        return;
      }

      //--------------------------------------------
      // 5. Save FULL local CUTATO auth
      //--------------------------------------------

      const cutatoUser = {
        name:
          profile.name ||
          authUser
            .user_metadata
            ?.name ||
          authUser.email.split(
            "@"
          )[0] ||
          "User",

        email:
          authUser.email,

        role,

        barberId:
          profile.barber_id ||
          undefined,

        salonId:
          profile.salon_id ||
          undefined,

        supabaseUserId:
          authUser.id,
      };

      signIn(
        cutatoUser
      );

      console.log(
        "CUTATO LOGIN:",
        {
          role:
            cutatoUser.role,

          barberId:
            cutatoUser.barberId,

          salonId:
            cutatoUser.salonId,

          supabaseUserId:
            cutatoUser.supabaseUserId,
        }
      );

      //--------------------------------------------
      // 6. Correct redirect
      //--------------------------------------------

      // If a customer came from a protected page,
      // respect ?next=...
      //
      // Salon/barber accounts always go to their
      // own portal.

      if (
        role ===
          "customer" &&
        requestedNext &&
        requestedNext.startsWith(
          "/"
        )
      ) {
        router.replace(
          requestedNext
        );

        return;
      }

      router.replace(
        getRoleDestination(
          role
        )
      );

      router.refresh();
    } catch (
      error: unknown
    ) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : "Login failed."
      );
    } finally {
      setLoading(false);
    }
  }

  //------------------------------------------------
  // UI
  //------------------------------------------------

  return (
    <WebShell
      title="Welcome back"
      subtitle="Sign in to your Cutato account."
    >
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        {/* ========================================
            LEFT
        ======================================== */}

        <section className="relative overflow-hidden rounded-[36px] bg-neutral-950 p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-10">
          <div className="absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#ff355d]/30 blur-3xl" />

          <div className="absolute bottom-[-120px] left-[-120px] h-80 w-80 rounded-full bg-white/10 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white/80">
              <Sparkles
                size={15}
              />

              Cutato platform
            </div>

            <h2 className="mt-8 text-4xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">
              Your grooming
              experience in one
              place.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-white/60">
              Customers can book
              appointments while
              barbers and salons
              manage their business
              from their own portal.
            </p>

            <div className="mt-10 grid gap-3">
              <Feature
                icon={
                  <CalendarCheck
                    size={18}
                  />
                }
                text="Book and manage appointments"
              />

              <Feature
                icon={
                  <Scissors
                    size={18}
                  />
                }
                text="Barber and salon portals"
              />

              <Feature
                icon={
                  <MapPin
                    size={18}
                  />
                }
                text="Find trusted barbers nearby"
              />
            </div>
          </div>
        </section>

        {/* ========================================
            LOGIN
        ======================================== */}

        <section className="rounded-[36px] border border-black/10 bg-white p-6 shadow-[0_20px_70px_rgba(0,0,0,0.07)] md:p-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
              Login
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em]">
              Sign in to Cutato
            </h1>

            <p className="mt-3 text-sm text-neutral-500">
              Customer, barber and
              salon accounts can all
              sign in here.
            </p>
          </div>

          <form
            onSubmit={
              onSubmit
            }
            className="mt-8 grid gap-5"
          >
            {/* EMAIL */}

            <div className="grid gap-2">
              <label className="text-sm font-black">
                Email
              </label>

              <input
                type="email"
                value={
                  email
                }
                onChange={(
                  event
                ) =>
                  setEmail(
                    event
                      .target
                      .value
                  )
                }
                placeholder="you@example.com"
                autoComplete="email"
                className="h-14 rounded-2xl border border-black/10 bg-neutral-50 px-5 text-sm font-semibold outline-none transition focus:border-[#ff355d] focus:bg-white"
              />
            </div>

            {/* PASSWORD */}

            <div className="grid gap-2">
              <label className="text-sm font-black">
                Password
              </label>

              <div className="relative">
                <input
                  value={
                    password
                  }
                  onChange={(
                    event
                  ) =>
                    setPassword(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="••••••••"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="current-password"
                  className="h-14 w-full rounded-2xl border border-black/10 bg-neutral-50 px-5 pr-14 text-sm font-semibold outline-none transition focus:border-[#ff355d] focus:bg-white"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                  className="absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-neutral-500 shadow-sm transition hover:text-[#ff355d]"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff
                      size={18}
                    />
                  ) : (
                    <Eye
                      size={18}
                    />
                  )}
                </button>
              </div>
            </div>

            {/* OPTIONS */}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-bold text-neutral-500">
                <input
                  type="checkbox"
                  checked={
                    remember
                  }
                  onChange={(
                    event
                  ) =>
                    setRemember(
                      event
                        .target
                        .checked
                    )
                  }
                  className="h-4 w-4 accent-[#ff355d]"
                />

                Remember me
              </label>

              <Link
                className="text-sm font-black text-[#ff355d] hover:underline"
                href={`/forgot-password?email=${encodeURIComponent(
                  email
                )}`}
              >
                Forgot password?
              </Link>
            </div>

            {/* ERROR */}

            {errorMessage ? (
              <div className="rounded-2xl border border-[#ff355d]/25 bg-[#ff355d]/10 p-4 text-sm font-bold text-[#ff355d]">
                {
                  errorMessage
                }
              </div>
            ) : null}

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={
                !canSubmit
              }
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#ff355d] px-6 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:-translate-y-0.5 hover:bg-[#ff1f4c] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <Lock
                size={17}
              />

              {loading
                ? "Signing in..."
                : "Sign in"}
            </button>
          </form>

          <div className="mt-6 border-t border-black/10 pt-6 text-center">
            <p className="text-sm text-neutral-500">
              Don&apos;t have a
              customer account?{" "}
              <Link
                href="/signup"
                className="font-black text-[#ff355d]"
              >
                Create one
              </Link>
            </p>
          </div>
        </section>
      </div>
    </WebShell>
  );
}

//==================================================
// FEATURE
//==================================================

function Feature({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
      <div className="rounded-xl bg-[#ff355d] p-2 text-white">
        {icon}
      </div>

      <p className="text-sm font-bold text-white/80">
        {text}
      </p>
    </div>
  );
}
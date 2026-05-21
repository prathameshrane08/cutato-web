"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WebShell from "@/app/Components/WebShell";
import { getAuthUser, signIn } from "@/app/Components/auth";

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function SalonLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("salon@cutato.com");
  const [name, setName] = useState("Salon Owner");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");

  useEffect(() => {
    const u = getAuthUser();
    if (!u) return;

    if (u.role === "salon") router.replace("/portal/salon");
    else if (u.role === "barber") router.replace("/portal/barber");
    else router.replace("/");
  }, [router]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }

    if (!isEmail(normalizedEmail)) {
      setError("Please enter a valid email.");
      return;
    }

    signIn({
      name: trimmedName,
      email: normalizedEmail,
      role: "salon",
    });

    router.push("/portal/salon");
  }

  return (
    <WebShell
      title="Salon login"
      subtitle="Sign in to manage staff, services, bookings, and settings."
    >
      <div className="mx-auto max-w-md">
        <div className="theme-card" style={{ padding: 20 }}>
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
            <div>
              <div style={labelStyle}>Name</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Salon owner"
                style={inputStyle}
              />
            </div>

            <div>
              <div style={labelStyle}>Email</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="salon@cutato.com"
                style={inputStyle}
              />
            </div>

            <div>
              <div style={labelStyle}>Password</div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>

            {error ? <ErrorBox text={error} /> : null}

            <button className="btn btn-primary" type="submit">
              Login as salon
            </button>

            <div className="theme-muted" style={{ fontSize: 12 }}>
              Demo login. This signs you in with the <b>salon</b> role.
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/portal/barber/login" className="btn btn-secondary" style={{ flex: 1 }}>
                Barber login
              </Link>
              <Link href="/login" className="btn btn-secondary" style={{ flex: 1 }}>
                Customer login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </WebShell>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 12,
        background: "rgba(255,59,94,0.10)",
        border: "1px solid rgba(255,59,94,0.22)",
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      {text}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 13,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  padding: "0 12px",
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.10)",
  background: "rgba(0,0,0,0.02)",
  outline: "none",
  fontWeight: 800,
};
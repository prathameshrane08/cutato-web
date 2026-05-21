"use client";

import { useEffect, useState } from "react";

type Theme = "uber" | "airbnb" | "luxury";

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("uber");

  useEffect(() => {
    const saved = (localStorage.getItem("cutato_theme") as Theme) || "uber";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  function apply(t: Theme) {
    setTheme(t);
    localStorage.setItem("cutato_theme", t);
    document.documentElement.setAttribute("data-theme", t);
  }

  const Btn = ({ t, label }: { t: Theme; label: string }) => (
    <button
      onClick={() => apply(t)}
      className={`px-3 py-2 text-xs theme-card ${theme === t ? "theme-accent" : ""}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap gap-2">
      <Btn t="uber" label="Dark" />
      <Btn t="airbnb" label="Light" />
      <Btn t="luxury" label="Gold" />
    </div>
  );
}
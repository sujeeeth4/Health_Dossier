"use client";

import { useLayoutEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const storageKey = "health-dossier-theme";
const themeEvent = "health-dossier-theme-change";

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");

  useLayoutEffect(() => {
    const sync = () => setTheme(currentTheme());
    sync();
    window.addEventListener(themeEvent, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(themeEvent, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = () => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { window.localStorage.setItem(storageKey, next); } catch { /* private browsing */ }
    window.dispatchEvent(new Event(themeEvent));
  };

  const dark = theme === "dark";
  return <button
    type="button"
    className={`theme-toggle ${compact ? "theme-toggle-compact" : ""}`}
    onClick={toggle}
    aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
    aria-pressed={dark}
    title={`Switch to ${dark ? "light" : "dark"} mode`}
  >
    {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    {!compact && <span>{dark ? "Light mode" : "Dark mode"}</span>}
  </button>;
}

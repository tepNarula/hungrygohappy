/**
 * @file src/components/TopHeaderControls.tsx
 * @description Global top-left header utility controls for Hungry Roulette.
 * 
 * Provides interactive capability:
 * - Theme Switcher (Light / Dark mode):
 *   - Defaults to 'dark' mode on initial visit when no preference is saved.
 *   - Persists the user's choice in browser localStorage (`hungry_theme`).
 *   - Dynamically updates the `.dark` CSS class on `document.documentElement`.
 */

import { useEffect, useState, useCallback } from "react";
import { Sun, Moon } from "lucide-react";

/** Storage key used to persist theme mode in localStorage across sessions */
export const THEME_STORAGE_KEY = "hungry_theme";

export type ThemeMode = "dark" | "light";

/**
 * Reads the current theme preference from localStorage, defaulting to 'dark'.
 * Defensively catches any SecurityError / QuotaExceededError in restricted iframes.
 */
export function getSavedTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/**
 * Applies the selected theme to `document.documentElement` and persists it.
 */
export function applyTheme(theme: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (err) {
    console.warn("[TopHeaderControls] Unable to persist theme:", err);
  }
}

/**
 * TopHeaderControls Component
 * 
 * Renders an accessible round icon button anchored at the top-left of the viewport.
 */
export function TopHeaderControls() {
  // Local React state synchronized with localStorage and DOM
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [mounted, setMounted] = useState<boolean>(false);

  // Initialize theme preference on initial client-side mount
  useEffect(() => {
    const initialTheme = getSavedTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  // Handler: toggle between Light and Dark themes
  const handleToggleTheme = useCallback(() => {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, [theme]);

  // Prevent hydration mismatch by rendering an inert placeholder until client hydration completes
  if (!mounted) {
    return (
      <aside
        aria-label="Display Controls"
        className="fixed top-3 left-3 z-40 flex items-center gap-1.5 pointer-events-none opacity-0"
      >
        <div className="h-9 w-9 rounded-full bg-muted border border-border" />
      </aside>
    );
  }

  return (
    <aside
      aria-label="Display Controls"
      className="fixed top-3 left-3 z-40 flex items-center gap-1.5 print:hidden"
    >
      {/* Theme Switcher Button */}
      <button
        type="button"
        onClick={handleToggleTheme}
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/85 text-foreground backdrop-blur-md transition-all hover:bg-accent hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-sm"
      >
        {theme === "dark" ? (
          <Sun className="h-4 w-4 text-amber-400 transition-transform group-hover:rotate-45" />
        ) : (
          <Moon className="h-4 w-4 text-sky-600 transition-transform group-hover:-rotate-12" />
        )}
      </button>
    </aside>
  );
}

export default TopHeaderControls;

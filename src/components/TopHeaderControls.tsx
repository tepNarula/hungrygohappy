/**
 * @file src/components/TopHeaderControls.tsx
 * @description Global top-left header utility controls for Hungry Roulette.
 * 
 * Provides two primary interactive capabilities:
 * 1. Theme Switcher (Light / Dark mode):
 *    - Defaults to 'dark' mode on initial visit when no preference is saved.
 *    - Persists the user's choice in browser localStorage (`hungry_theme`).
 *    - Dynamically updates the `.dark` CSS class on `document.documentElement`.
 * 
 * 2. Viewport Frame Simulator (Desktop / Mobile view):
 *    - Allows users on desktop monitors to simulate a phone viewport width (`max-w-[420px]`).
 *    - Persists choice in localStorage (`hungry_viewport_frame`).
 *    - Dispatches a custom window event (`hungry:viewport-frame-change`) and sets
 *      a `data-viewport-frame` attribute on `document.documentElement` so child
 *      layouts or the root container can wrap responsive content cleanly.
 */

import { useEffect, useState, useCallback } from "react";
import { Sun, Moon, Smartphone, Monitor } from "lucide-react";

/** Storage key used to persist theme mode in localStorage across sessions */
export const THEME_STORAGE_KEY = "hungry_theme";

/** Storage key used to persist simulated mobile viewport mode across sessions */
export const VIEWPORT_FRAME_STORAGE_KEY = "hungry_viewport_frame";

/** Custom DOM event name fired whenever the simulated viewport frame toggles */
export const VIEWPORT_FRAME_EVENT = "hungry:viewport-frame-change";

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
 * Reads whether the simulated mobile viewport frame is active.
 * Default is false (normal responsive layout).
 */
export function getSavedViewportFrame(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(VIEWPORT_FRAME_STORAGE_KEY) === "mobile";
  } catch {
    return false;
  }
}

/**
 * Applies the viewport frame preference to `document.documentElement`
 * and notifies any listening layout components via a DOM event.
 */
export function applyViewportFrame(isMobileFrame: boolean): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (isMobileFrame) {
    root.setAttribute("data-viewport-frame", "mobile");
  } else {
    root.removeAttribute("data-viewport-frame");
  }

  try {
    localStorage.setItem(VIEWPORT_FRAME_STORAGE_KEY, isMobileFrame ? "mobile" : "desktop");
  } catch (err) {
    console.warn("[TopHeaderControls] Unable to persist viewport frame:", err);
  }

  // Notify components (such as RootComponent) to adjust their wrapper container styles
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(VIEWPORT_FRAME_EVENT, { detail: { isMobileFrame } })
    );
  }
}

/**
 * TopHeaderControls Component
 * 
 * Renders two round, accessible icon buttons anchored at the top-left of the viewport.
 */
export function TopHeaderControls() {
  // Local React state synchronized with localStorage and DOM
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // Initialize preferences on initial client-side mount
  useEffect(() => {
    const initialTheme = getSavedTheme();
    const initialFrame = getSavedViewportFrame();

    setTheme(initialTheme);
    setIsMobileFrame(initialFrame);
    applyTheme(initialTheme);
    applyViewportFrame(initialFrame);
    setMounted(true);
  }, []);

  // Handler: toggle between Light and Dark themes
  const handleToggleTheme = useCallback(() => {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, [theme]);

  // Handler: toggle between Full Responsive and Simulated Mobile Frame
  const handleToggleFrame = useCallback(() => {
    const nextFrame = !isMobileFrame;
    setIsMobileFrame(nextFrame);
    applyViewportFrame(nextFrame);
  }, [isMobileFrame]);

  // Prevent hydration mismatch by rendering inert placeholders until client hydration completes
  if (!mounted) {
    return (
      <aside
        aria-label="Display Controls"
        className="fixed top-3 left-3 z-40 flex items-center gap-1.5 pointer-events-none opacity-0"
      >
        <div className="h-9 w-9 rounded-full bg-muted border border-border" />
        <div className="h-9 w-9 rounded-full bg-muted border border-border" />
      </aside>
    );
  }

  return (
    <aside
      aria-label="Display Controls"
      className="fixed top-3 left-3 z-40 flex items-center gap-1.5 print:hidden"
    >
      {/* 1. Theme Switcher Button */}
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

      {/* 2. Desktop / Mobile Frame Toggle Button */}
      <button
        type="button"
        onClick={handleToggleFrame}
        aria-label={
          isMobileFrame
            ? "Switch to full desktop viewport"
            : "Simulate mobile phone frame"
        }
        title={
          isMobileFrame
            ? "Switch to full desktop viewport"
            : "Simulate mobile phone frame (420px max-width)"
        }
        className={`group relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/85 text-foreground backdrop-blur-md transition-all hover:bg-accent hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-sm ${
          isMobileFrame ? "ring-2 ring-primary bg-primary/10 text-primary" : ""
        }`}
      >
        {isMobileFrame ? (
          <Monitor className="h-4 w-4 transition-transform group-hover:scale-110" />
        ) : (
          <Smartphone className="h-4 w-4 transition-transform group-hover:scale-110" />
        )}
      </button>
    </aside>
  );
}

export default TopHeaderControls;

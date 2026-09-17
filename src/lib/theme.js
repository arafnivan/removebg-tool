/**
 * Light / dark / system theme, stored per browser. index.html applies the
 * saved choice before the page paints, so there is no flash.
 */

const KEY = "theme";
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

export function getTheme() {
  try {
    return localStorage.getItem(KEY) || "system";
  } catch {
    return "system";
  }
}

export function applyTheme(theme) {
  const dark = theme === "dark" || (theme === "system" && media().matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function setTheme(theme) {
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // Storage can be blocked; the choice still applies for this visit.
  }
  applyTheme(theme);
}

/** Follow the OS setting while the theme is "system". Returns an unsubscribe. */
export function watchSystemTheme() {
  const query = media();
  const onChange = () => {
    if (getTheme() === "system") applyTheme("system");
  };
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

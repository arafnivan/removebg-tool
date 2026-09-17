// Apply the saved theme before first paint (see src/lib/theme.js). Kept in a
// file rather than inline so the Content-Security-Policy needs no exceptions.
try {
  var theme = localStorage.getItem("theme") || "system";
  if (theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.classList.add("dark");
  }
} catch (e) {}

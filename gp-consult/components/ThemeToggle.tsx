"use client";

export function ThemeToggle() {
  const toggle = () => {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {}
  };
  return (
    <button onClick={toggle} aria-label="Toggle dark mode" className="rounded-lg px-2 py-1.5 text-lg text-muted hover:text-ink">
      ◐
    </button>
  );
}

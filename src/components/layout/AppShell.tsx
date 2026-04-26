import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Moon, Sun, Trophy, X } from "lucide-react";
import { useStore } from "../../hooks/useStore";

export function AppShell({ children }: { children: JSX.Element }) {
  const { currentUser, clearSession } = useStore();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("spevgo-theme");
    const next = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("spevgo-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  const closeMobileMenu = () => setMobileOpen(false);

  return (
    <div className="min-h-screen">
      <header className={`sticky top-0 z-20 border-b border-emerald-100/80 bg-white/80 backdrop-blur-xl transition-all dark:border-slate-700 dark:bg-slate-950/75 ${scrolled ? "shadow-md shadow-slate-900/5" : ""}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-xl font-black tracking-tight text-emerald-700">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              <Trophy size={16} />
            </span>
            spevgo
          </Link>
          <div className="hidden items-center gap-2 text-sm md:flex">
            <Link to="/" className="rounded-full px-3 py-1.5 transition hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-slate-800">Inicio</Link>
            {currentUser && <Link to="/mis-eventos" className="rounded-full px-3 py-1.5 transition hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-slate-800">Mis Eventos</Link>}
            {currentUser && <Link to="/crear-evento" className="rounded-full px-3 py-1.5 transition hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-slate-800">Crear Evento</Link>}
            {currentUser?.role === "admin" && <Link to="/admin" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300">Admin</Link>}
            <button className="btn-soft !rounded-full" onClick={toggleTheme} aria-label="Cambiar tema">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {!currentUser ? (
              <>
                <Link to="/login" className="rounded-full px-3 py-1.5 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Login</Link>
                <Link to="/register" className="rounded-full bg-emerald-600 px-3 py-1.5 text-white shadow-sm transition hover:bg-emerald-700">Registro</Link>
              </>
            ) : (
              <button
                className="rounded-full bg-slate-200 px-3 py-1.5 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                onClick={async () => {
                  await clearSession();
                  nav("/", { replace: true });
                }}
              >
                Salir
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <button className="btn-soft !rounded-full !p-2" onClick={toggleTheme} aria-label="Cambiar tema">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className="btn-soft !rounded-full !p-2" onClick={() => setMobileOpen((v) => !v)} aria-label="Abrir menu">
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="mx-4 mb-3 space-y-1 rounded-2xl border border-emerald-100 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:hidden">
            <Link to="/" onClick={closeMobileMenu} className="block rounded-xl px-3 py-2 text-sm dark:text-slate-200">Inicio</Link>
            {currentUser && <Link to="/mis-eventos" onClick={closeMobileMenu} className="block rounded-xl px-3 py-2 text-sm dark:text-slate-200">Mis Eventos</Link>}
            {currentUser && <Link to="/crear-evento" onClick={closeMobileMenu} className="block rounded-xl px-3 py-2 text-sm dark:text-slate-200">Crear Evento</Link>}
            {currentUser?.role === "admin" && <Link to="/admin" onClick={closeMobileMenu} className="block rounded-xl px-3 py-2 text-sm dark:text-slate-200">Admin</Link>}
            {!currentUser ? (
              <>
                <Link to="/login" onClick={closeMobileMenu} className="block rounded-xl px-3 py-2 text-sm dark:text-slate-200">Login</Link>
                <Link to="/register" onClick={closeMobileMenu} className="block rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Registro</Link>
              </>
            ) : (
              <button
                className="block w-full rounded-xl bg-slate-200 px-3 py-2 text-left text-sm dark:bg-slate-800 dark:text-slate-200"
                onClick={async () => {
                  await clearSession();
                  closeMobileMenu();
                  nav("/", { replace: true });
                }}
              >
                Salir
              </button>
            )}
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <footer className="mt-10 border-t border-emerald-100/70 bg-white/75 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3">
          <span>Spevgo Colombia - Tu proxima aventura deportiva te espera</span>
          <span>Ley 1581/2012 y politica de privacidad</span>
        </div>
      </footer>
    </div>
  );
}

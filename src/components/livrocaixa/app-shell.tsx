import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPerfil } from "@/lib/livrocaixa.functions";
import { souAdmin } from "@/lib/admin.functions";
import { LogOut, LayoutDashboard, Wallet, Settings, Moon, Sun, Shield, CalendarClock } from "lucide-react";
import { toast } from "sonner";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const perfilFn = useServerFn(getPerfil);
  const { data: perfil, error: perfilError } = useQuery({ queryKey: ["perfil"], queryFn: () => perfilFn(), retry: false });
  const souAdminFn = useServerFn(souAdmin);
  const { data: perm } = useQuery({ queryKey: ["souAdmin"], queryFn: () => souAdminFn(), retry: false });
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const isDark = perfil?.tema === "escuro";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, [perfil?.tema]);

  useEffect(() => {
    if (perfilError && /bloqueada/i.test(String((perfilError as Error).message))) {
      toast.error("Sua conta está bloqueada.", { description: "Contate o administrador." });
      supabase.auth.signOut().then(() => navigate({ to: "/auth", replace: true }));
    }
  }, [perfilError, navigate]);

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function toggleTema() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  }

  const baseLinks = [
    { to: "/", label: "Visão geral", icon: LayoutDashboard },
    { to: "/transacoes", label: "Transações", icon: Wallet },
    { to: "/contas", label: "Contas", icon: CalendarClock },
    { to: "/configuracoes", label: "Configurações", icon: Settings },
  ] as const;
  const links = perm?.admin
    ? [...baseLinks, { to: "/admin", label: "Administração", icon: Shield } as const]
    : baseLinks;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="hidden md:flex md:w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="font-serif text-2xl font-semibold text-sidebar-primary">Livro Caixa</h1>
          <p className="text-xs opacity-70 mt-1">Controle financeiro</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map((l) => {
            const active = pathname === l.to;
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "hover:bg-sidebar-accent"
                }`}
              >
                <Icon className="w-4 h-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <div className="px-3 py-2 text-xs opacity-70 truncate">{perfil?.nome ?? "Usuário"}</div>
          <button
            onClick={toggleTema}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {dark ? "Tema claro" : "Tema escuro"}
          </button>
          <button
            onClick={sair}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
          <h1 className="font-serif text-xl font-semibold text-sidebar-primary">Livro Caixa</h1>
          <nav className="flex gap-1">
            {links.map((l) => {
              const Icon = l.icon;
              const active = pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`p-2 rounded-md ${active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent"}`}
                  aria-label={l.label}
                >
                  <Icon className="w-4 h-4" />
                </Link>
              );
            })}
            <button onClick={sair} aria-label="Sair" className="p-2 rounded-md hover:bg-sidebar-accent">
              <LogOut className="w-4 h-4" />
            </button>
          </nav>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPerfil } from "@/lib/livrocaixa.functions";
import { souAdmin } from "@/lib/admin.functions";
import { listarWorkspaces, trocarWorkspaceAtivo } from "@/lib/workspaces.functions";
import { LogOut, LayoutDashboard, Wallet, Settings, Shield, CalendarClock, Users, Check, ChevronDown, CreditCard, Target, TrendingUp } from "lucide-react";
import { LivroCaixaLogo } from "./logo";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const perfilFn = useServerFn(getPerfil);
  const { data: perfil, error: perfilError } = useQuery({ queryKey: ["perfil"], queryFn: () => perfilFn(), retry: false });
  const souAdminFn = useServerFn(souAdmin);
  const { data: perm } = useQuery({ queryKey: ["souAdmin"], queryFn: () => souAdminFn(), retry: false });
  const wsFn = useServerFn(listarWorkspaces);
  const { data: workspaces } = useQuery({ queryKey: ["workspaces"], queryFn: () => wsFn(), retry: false });
  const trocarFn = useServerFn(trocarWorkspaceAtivo);
  const qc = useQueryClient();
  const trocar = useMutation({
    mutationFn: (id: string) => trocarFn({ data: { workspace_id: id } }),
    onSuccess: () => {
      toast.success("Workspace alterado");
      qc.invalidateQueries();
    },
  });
  const wsAtual = (workspaces ?? []).find((w) => w.id === perfil?.workspace_ativo) ?? workspaces?.[0];
  const tema = (perfil?.tema ?? "pergaminho") as "claro" | "pergaminho" | "escuro";

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", tema === "escuro");
    root.classList.toggle("pergaminho", tema === "pergaminho");
  }, [tema]);

  // Auto-hide sidebar (5s sem mouse). Aparece ao encostar na borda esquerda.
  const [open, setOpen] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleHide() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setOpen(false), 5000);
  }
  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);
  function handleEnter() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setOpen(true);
  }
  function handleLeave() {
    scheduleHide();
  }

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

  const baseLinks = [
    { to: "/", label: "Visão geral", icon: LayoutDashboard },
    { to: "/transacoes", label: "Transações", icon: Wallet },
    { to: "/contas", label: "Contas", icon: CalendarClock },
    { to: "/cartoes", label: "Cartões", icon: CreditCard },
    { to: "/metas", label: "Metas", icon: Target },
    { to: "/investimentos", label: "Investimentos", icon: TrendingUp },
    { to: "/workspace", label: "Workspace", icon: Users },
    { to: "/configuracoes", label: "Configurações", icon: Settings },
  ] as const;
  const links = perm?.admin
    ? [...baseLinks, { to: "/admin", label: "Administração", icon: Shield } as const]
    : baseLinks;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Zona sensível na lateral esquerda para reabrir o sidebar */}
      <div
        className="hidden md:block fixed left-0 top-0 h-full w-3 z-30"
        onMouseEnter={handleEnter}
        aria-hidden
      />
      <aside
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className={`hidden md:flex fixed md:static z-40 h-screen md:h-auto w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full md:-ml-64"
        }`}
      >
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <LivroCaixaLogo className="w-8 h-8 text-sidebar-primary shrink-0" />
            <h1 className="font-serif text-2xl font-semibold text-sidebar-primary">Livro Caixa</h1>
          </div>
          <p className="text-xs opacity-70 mt-1">Controle financeiro inteligente</p>
        </div>
        <div className="p-3 border-b border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent text-left">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ background: wsAtual?.cor ?? "#6366f1" }}
              >
                {(wsAtual?.nome ?? "?").slice(0, 1).toUpperCase()}
              </span>
              <span className="flex-1 min-w-0 truncate">{wsAtual?.nome ?? "Carregando..."}</span>
              <ChevronDown className="w-4 h-4 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Meus workspaces</DropdownMenuLabel>
              {(workspaces ?? []).map((w) => (
                <DropdownMenuItem key={w.id} onClick={() => trocar.mutate(w.id)}>
                  <span
                    className="w-4 h-4 rounded-full mr-2"
                    style={{ background: w.cor ?? "#6366f1" }}
                  />
                  <span className="flex-1 truncate">{w.nome}</span>
                  <span className="text-[10px] opacity-60 ml-2">{w.tipo === "conjunta" ? "conjunta" : "individual"}</span>
                  {wsAtual?.id === w.id && <Check className="w-3 h-3 ml-2" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/workspace">Gerenciar workspaces →</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          <div className="px-3 py-2 flex items-center gap-2">
            <Avatar className="w-7 h-7">
              {perfil?.avatar_url ? <AvatarImage src={perfil.avatar_url} alt={perfil?.nome ?? ""} /> : null}
              <AvatarFallback className="text-[10px] font-bold text-white" style={{ background: wsAtual?.cor ?? "#6366f1" }}>
                {(perfil?.nome ?? "?").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-xs opacity-80 truncate">{perfil?.nome ?? "Usuário"}</div>
          </div>
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
          <div className="flex items-center gap-2">
            <LivroCaixaLogo className="w-6 h-6 text-sidebar-primary shrink-0" />
            <h1 className="font-serif text-xl font-semibold text-sidebar-primary">Livro Caixa</h1>
          </div>
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
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { resumoDashboard } from "@/lib/livrocaixa.functions";
import { resumoContas } from "@/lib/contas.functions";
import { listarCartoes } from "@/lib/cartoes.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CreditCard } from "lucide-react";
import { getBanco } from "@/lib/bancos";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { TransacaoModal, formatBRL } from "@/components/livrocaixa/transacao-modal";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function Dashboard() {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [modal, setModal] = useState<{ open: boolean; tipo: "receita" | "despesa" }>({ open: false, tipo: "despesa" });
  const resumoFn = useServerFn(resumoDashboard);
  const { data: rows } = useQuery({
    queryKey: ["resumo", ano],
    queryFn: () => resumoFn({ data: { ano } }),
  });
  const resumoContasFn = useServerFn(resumoContas);
  const { data: contasResumo } = useQuery({
    queryKey: ["resumoContas"],
    queryFn: () => resumoContasFn(),
  });
  const cartoesFn = useServerFn(listarCartoes);
  const { data: cartoes } = useQuery({ queryKey: ["cartoes"], queryFn: () => cartoesFn() });

  const mesAtual = new Date().getMonth();
  const agregados = useMemo(() => {
    const porMes = Array.from({ length: 12 }, () => ({ receitas: 0, despesas: 0 }));
    const porCategoriaMes = new Map<string, { valor: number; cor: string | null }>();
    let receitasMes = 0, despesasMes = 0;
    for (const r of rows ?? []) {
      const mes = Number((r.data as string).slice(5, 7)) - 1;
      const v = Number(r.valor);
      if (r.tipo === "receita") porMes[mes].receitas += v;
      else porMes[mes].despesas += v;
      if (mes === mesAtual) {
        if (r.tipo === "receita") receitasMes += v;
        else {
          despesasMes += v;
          const nome = (r as any).categorias?.nome ?? "Sem categoria";
          const cor = (r as any).categorias?.cor ?? null;
          const atual = porCategoriaMes.get(nome) ?? { valor: 0, cor };
          porCategoriaMes.set(nome, { valor: atual.valor + v, cor });
        }
      }
    }
    return { porMes, porCategoriaMes, receitasMes, despesasMes };
  }, [rows, mesAtual]);

  const saldo = agregados.receitasMes - agregados.despesasMes;

  const barData = {
    labels: MESES,
    datasets: [
      { label: "Receitas", data: agregados.porMes.map((m) => m.receitas), backgroundColor: "rgb(90,170,120)" },
      { label: "Despesas", data: agregados.porMes.map((m) => m.despesas), backgroundColor: "rgb(210,90,80)" },
    ],
  };

  const catEntries = Array.from(agregados.porCategoriaMes.entries()).sort((a, b) => b[1].valor - a[1].valor);
  const pizzaData = {
    labels: catEntries.map(([n]) => n),
    datasets: [
      {
        data: catEntries.map(([, v]) => v.valor),
        backgroundColor: catEntries.map(([, v], i) => v.cor ?? `hsl(${(i * 47) % 360} 55% 55%)`),
      },
    ],
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Visão geral</h1>
          <p className="text-sm text-muted-foreground">Seu resumo financeiro de {MESES[mesAtual]}/{ano}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAno(ano - 1)}>‹ {ano - 1}</Button>
          <Button variant="outline" disabled>{ano}</Button>
          <Button variant="outline" onClick={() => setAno(ano + 1)}>{ano + 1} ›</Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo do mês</p>
          <p className={`font-mono text-3xl font-bold mt-2 ${saldo >= 0 ? "text-[color:var(--color-receita)]" : "text-[color:var(--color-despesa)]"}`}>
            {formatBRL(saldo)}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Receitas</p>
          <p className="font-mono text-3xl font-bold mt-2 text-[color:var(--color-receita)]">
            {formatBRL(agregados.receitasMes)}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Despesas</p>
          <p className="font-mono text-3xl font-bold mt-2 text-[color:var(--color-despesa)]">
            {formatBRL(agregados.despesasMes)}
          </p>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => setModal({ open: true, tipo: "receita" })}
          style={{ backgroundColor: "var(--color-receita)", color: "white" }}
        >
          + Nova receita
        </Button>
        <Button
          onClick={() => setModal({ open: true, tipo: "despesa" })}
          style={{ backgroundColor: "var(--color-despesa)", color: "white" }}
        >
          + Nova despesa
        </Button>
      </div>

      {contasResumo && (contasResumo.atrasadas > 0 || contasResumo.proximas > 0) && (
        <Card className="p-5 flex flex-wrap items-center gap-6">
          {contasResumo.atrasadas > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[color:var(--color-despesa)]">
                {contasResumo.atrasadas} conta{contasResumo.atrasadas > 1 ? "s" : ""} atrasada{contasResumo.atrasadas > 1 ? "s" : ""}
              </p>
              <p className="font-mono text-lg font-bold text-[color:var(--color-despesa)]">
                {formatBRL(Math.abs(contasResumo.atrasadasValor))}
              </p>
            </div>
          )}
          {contasResumo.proximas > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {contasResumo.proximas} conta{contasResumo.proximas > 1 ? "s" : ""} próxima{contasResumo.proximas > 1 ? "s" : ""}
              </p>
              <p className="font-mono text-lg font-bold">{formatBRL(Math.abs(contasResumo.proximasValor))}</p>
            </div>
          )}
          <div className="grow" />
          <Link to="/contas" className="text-sm underline underline-offset-4">Ver contas →</Link>
        </Card>
      )}

      {(cartoes ?? []).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Cartões de crédito
            </h2>
            <Link to="/cartoes" className="text-sm underline underline-offset-4">Ver todos →</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {(cartoes ?? []).filter((c: any) => c.ativo !== false).map((c: any) => {
              const banco = getBanco(c.banco);
              const usado = Number(c.total_em_aberto ?? 0);
              const limite = Number(c.limite ?? 0);
              const pct = limite > 0 ? Math.min(100, (usado / limite) * 100) : 0;
              const alto = pct >= 80;
              return (
                <Link key={c.id} to="/cartoes/$id" params={{ id: c.id }}>
                  <Card className="p-4 space-y-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: c.cor ?? banco?.cor ?? "#333" }}
                      >
                        {banco?.inicial ?? c.nome.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{c.nome}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {banco?.nome ?? c.banco}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Limite usado</span>
                        <span className={`font-mono font-medium ${alto ? "text-[color:var(--color-despesa)]" : ""}`}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={pct} className={alto ? "[&>div]:bg-[color:var(--color-despesa)]" : ""} />
                      <div className="flex justify-between text-xs mt-1.5 font-mono">
                        <span className="text-muted-foreground">{formatBRL(usado)}</span>
                        <span className="text-muted-foreground">/ {limite > 0 ? formatBRL(limite) : "—"}</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-serif text-lg font-semibold mb-4">Receitas x Despesas — {ano}</h2>
          <div className="h-72"><Bar data={barData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }} /></div>
        </Card>
        <Card className="p-5">
          <h2 className="font-serif text-lg font-semibold mb-4">Despesas por categoria — {MESES[mesAtual]}</h2>
          <div className="h-72">
            {catEntries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem despesas neste mês</div>
            ) : (
              <Doughnut data={pizzaData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }} />
            )}
          </div>
        </Card>
      </div>

      <TransacaoModal
        open={modal.open}
        onOpenChange={(v) => setModal((m) => ({ ...m, open: v }))}
        tipoDefault={modal.tipo}
      />
    </div>
  );
}
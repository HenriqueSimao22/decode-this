import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { resumoPeriodo } from "@/lib/livrocaixa.functions";
import { Card } from "@/components/ui/card";
import { Bar, Doughnut } from "react-chartjs-2";
import { useThemeChartColors } from "@/lib/theme-colors";
import {
  FiltroPeriodo,
  periodoInicial,
  calcularRange,
  bucketizeReceitasDespesas,
  agruparDespesasPorCategoria,
} from "./filtro-periodo";
import { formatBRL } from "@/components/livrocaixa/transacao-modal";

export function GraficoReceitasDespesas() {
  const [periodo, setPeriodo] = useState(periodoInicial);
  const range = calcularRange(periodo);
  const cores = useThemeChartColors();

  const resumoFn = useServerFn(resumoPeriodo);
  const { data: rows } = useQuery({
    queryKey: ["resumoPeriodo", range.inicio, range.fim],
    queryFn: () => resumoFn({ data: { inicio: range.inicio, fim: range.fim } }),
  });

  const { labels, receitas, despesas } = bucketizeReceitasDespesas(rows ?? [], range.inicio, range.fim);

  const data = {
    labels,
    datasets: [
      { label: "Receitas", data: receitas, backgroundColor: cores.receita },
      { label: "Despesas", data: despesas, backgroundColor: cores.despesa },
    ],
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="font-serif text-lg font-semibold">Receitas x Despesas — {range.label}</h2>
        <FiltroPeriodo periodo={periodo} onChange={(n) => setPeriodo((p) => ({ ...p, ...n }))} />
      </div>
      <div className="h-72">
        <Bar
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "bottom", labels: { color: cores.foreground } },
              tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatBRL(Number(ctx.raw))}` } },
            },
            scales: {
              x: { ticks: { color: cores.mutedForeground }, grid: { color: cores.border } },
              y: {
                ticks: { color: cores.mutedForeground, callback: (v) => formatBRL(Number(v)) },
                grid: { color: cores.border },
              },
            },
          }}
        />
      </div>
    </Card>
  );
}

export function GraficoDespesasCategoria() {
  const [periodo, setPeriodo] = useState(periodoInicial);
  const range = calcularRange(periodo);
  const cores = useThemeChartColors();

  const resumoFn = useServerFn(resumoPeriodo);
  const { data: rows } = useQuery({
    queryKey: ["resumoPeriodo", range.inicio, range.fim],
    queryFn: () => resumoFn({ data: { inicio: range.inicio, fim: range.fim } }),
  });

  const catEntries = agruparDespesasPorCategoria(rows ?? []);
  const data = {
    labels: catEntries.map(([n]) => n),
    datasets: [
      {
        data: catEntries.map(([, v]) => v.valor),
        backgroundColor: catEntries.map(([, v], i) => v.cor ?? `hsl(${(i * 47) % 360} 55% 55%)`),
      },
    ],
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="font-serif text-lg font-semibold">Despesas por categoria — {range.label}</h2>
        <FiltroPeriodo periodo={periodo} onChange={(n) => setPeriodo((p) => ({ ...p, ...n }))} />
      </div>
      <div className="h-72">
        {catEntries.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem despesas neste período</div>
        ) : (
          <Doughnut
            data={data}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: "bottom", labels: { color: cores.foreground } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatBRL(Number(ctx.raw))}` } },
              },
            }}
          />
        )}
      </div>
    </Card>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarInvestimentos, excluirInvestimento, atualizarValorInvestimento } from "@/lib/investimentos.functions";
import { InvestimentoModal, TIPOS_INVESTIMENTO, type InvestimentoEdit } from "@/components/livrocaixa/investimento-modal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/components/livrocaixa/transacao-modal";
import { Plus, Pencil, Trash2, TrendingUp, RefreshCw, Check, X, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/investimentos")({
  head: () => ({ meta: [{ title: "Investimentos — Livro Caixa" }] }),
  component: InvestimentosPage,
});

function InvestimentosPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listarInvestimentos);
  const delFn = useServerFn(excluirInvestimento);
  const { data: itens } = useQuery({ queryKey: ["investimentos"], queryFn: () => listFn() });

  const [modal, setModal] = useState<{ open: boolean; inicial?: InvestimentoEdit }>({ open: false });
  const [filtro, setFiltro] = useState<string>("todos");
  const [editandoValor, setEditandoValor] = useState<string | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Investimento removido"); qc.invalidateQueries({ queryKey: ["investimentos"] }); },
  });

  const filtrados = useMemo(
    () => (itens ?? []).filter((i: any) => filtro === "todos" || i.tipo === filtro),
    [itens, filtro],
  );

  const totais = useMemo(() => {
    let investido = 0, atual = 0;
    for (const i of itens ?? []) { investido += i.valor_investido; atual += i.valor_atual; }
    return { investido, atual, rentabilidade: investido > 0 ? ((atual - investido) / investido) * 100 : 0 };
  }, [itens]);

  const porTipo = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of itens ?? []) m.set(i.tipo, (m.get(i.tipo) ?? 0) + i.valor_atual);
    return m;
  }, [itens]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Investimentos</h1>
          <p className="text-sm text-muted-foreground">Ações, fundos imobiliários, criptomoedas e mais — tudo em um lugar</p>
        </div>
        <Button onClick={() => setModal({ open: true })}>
          <Plus className="w-4 h-4 mr-1" /> Novo investimento
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total investido</p>
          <p className="font-mono text-2xl font-bold mt-2">{formatBRL(totais.investido)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Valor atual (patrimônio)</p>
          <p className="font-mono text-2xl font-bold mt-2">{formatBRL(totais.atual)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Rentabilidade</p>
          <p className={`font-mono text-2xl font-bold mt-2 ${totais.rentabilidade >= 0 ? "text-[color:var(--color-receita)]" : "text-[color:var(--color-despesa)]"}`}>
            {totais.rentabilidade >= 0 ? "+" : ""}{totais.rentabilidade.toFixed(2)}%
          </p>
        </Card>
      </div>

      {(itens ?? []).length > 0 && (
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Distribuição por tipo</p>
          <div className="h-2 rounded overflow-hidden flex w-full">
            {TIPOS_INVESTIMENTO.map((t) => {
              const v = porTipo.get(t.valor) ?? 0;
              if (v <= 0 || totais.atual <= 0) return null;
              return <div key={t.valor} style={{ width: `${(v / totais.atual) * 100}%`, background: t.cor }} />;
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {TIPOS_INVESTIMENTO.filter((t) => (porTipo.get(t.valor) ?? 0) > 0).map((t) => (
              <span key={t.valor} className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: t.cor }} /> {t.label}
              </span>
            ))}
          </div>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant={filtro === "todos" ? "default" : "outline"} onClick={() => setFiltro("todos")}>Todos</Button>
        {TIPOS_INVESTIMENTO.map((t) => (
          <Button key={t.valor} size="sm" variant={filtro === t.valor ? "default" : "outline"} onClick={() => setFiltro(t.valor)}>
            {t.label}
          </Button>
        ))}
      </div>

      {(itens ?? []).length === 0 && (
        <Card className="p-10 text-center">
          <TrendingUp className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum investimento cadastrado ainda.</p>
          <Button className="mt-4" onClick={() => setModal({ open: true })}>Adicionar meu primeiro investimento</Button>
        </Card>
      )}

      <Card className="divide-y">
        {filtrados.map((i: any) => {
          const infoTipo = TIPOS_INVESTIMENTO.find((t) => t.valor === i.tipo);
          const positivo = i.rentabilidade_pct >= 0;
          return (
            <div key={i.id} className="p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: i.cor }}>
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-2">
                  {i.nome}
                  {i.ticker && <Badge variant="outline" className="text-[10px]">{i.ticker}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {infoTipo?.label} · {i.quantidade} un · preço médio {formatBRL(Number(i.preco_medio))}
                </div>
              </div>

              {editandoValor === i.id ? (
                <ValorAtualEditor
                  id={i.id}
                  valorInicial={i.valor_atual_unitario ?? i.preco_medio}
                  onDone={() => { setEditandoValor(null); qc.invalidateQueries({ queryKey: ["investimentos"] }); }}
                  onCancel={() => setEditandoValor(null)}
                />
              ) : (
                <div className="text-right">
                  <div className="font-mono font-semibold">{formatBRL(i.valor_atual)}</div>
                  <button onClick={() => setEditandoValor(i.id)} className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5" /> atualizar valor
                  </button>
                </div>
              )}

              <div className={`font-mono text-sm w-20 text-right ${positivo ? "text-[color:var(--color-receita)]" : "text-[color:var(--color-despesa)]"}`}>
                {positivo ? "+" : ""}{i.rentabilidade_pct.toFixed(1)}%
              </div>

              <button
                onClick={() => setModal({
                  open: true,
                  inicial: {
                    id: i.id, tipo: i.tipo, nome: i.nome, ticker: i.ticker,
                    quantidade: Number(i.quantidade), preco_medio: Number(i.preco_medio),
                    valor_atual_unitario: i.valor_atual_unitario != null ? Number(i.valor_atual_unitario) : null,
                    cor: i.cor, observacao: i.observacao,
                  },
                })}
                className="p-2 hover:bg-accent rounded"
                aria-label="Editar"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => confirm("Remover este investimento?") && del.mutate(i.id)}
                className="p-2 hover:bg-destructive/10 text-destructive rounded"
                aria-label="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </Card>

      <InvestimentoModal open={modal.open} onOpenChange={(v) => setModal({ open: v, inicial: v ? modal.inicial : undefined })} inicial={modal.inicial} />
    </div>
  );
}

function ValorAtualEditor({ id, valorInicial, onDone, onCancel }: { id: string; valorInicial: number; onDone: () => void; onCancel: () => void }) {
  const [valor, setValor] = useState(String(valorInicial));
  const atualizarFn = useServerFn(atualizarValorInvestimento);
  const mut = useMutation({
    mutationFn: () => atualizarFn({ data: { id, valor_atual_unitario: Number(valor.replace(",", ".")) } }),
    onSuccess: () => { toast.success("Valor atualizado"); onDone(); },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });
  return (
    <div className="flex items-center gap-1">
      <Input value={valor} onChange={(e) => setValor(e.target.value)} className="w-24 h-8" inputMode="decimal" autoFocus />
      <button onClick={() => mut.mutate()} className="p-1.5 hover:bg-accent rounded text-[color:var(--color-receita)]" aria-label="Confirmar">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={onCancel} className="p-1.5 hover:bg-accent rounded" aria-label="Cancelar">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

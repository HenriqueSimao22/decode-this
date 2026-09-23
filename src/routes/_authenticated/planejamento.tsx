import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  obterPlanejamento,
  iniciarPlanejamento,
  atualizarRendaPlanejada,
  excluirItemPlanejamento,
} from "@/lib/planejamento.functions";
import { ItemPlanejamentoModal, type ItemPlanejamentoEdit } from "@/components/livrocaixa/item-planejamento-modal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/components/livrocaixa/transacao-modal";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const Route = createFileRoute("/_authenticated/planejamento")({
  head: () => ({ meta: [{ title: "Planejamento — Livro Caixa" }] }),
  component: PlanejamentoPage,
});

function PlanejamentoPage() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const qc = useQueryClient();

  const obterFn = useServerFn(obterPlanejamento);
  const { data, isLoading } = useQuery({
    queryKey: ["planejamento", mes, ano],
    queryFn: () => obterFn({ data: { mes, ano } }),
  });

  const mudarMes = (delta: number) => {
    let m = mes + delta;
    let a = ano;
    if (m > 12) { m = 1; a++; }
    if (m < 1) { m = 12; a--; }
    setMes(m); setAno(a);
  };

  const planejamento = data?.planejamento ?? null;
  const itens = data?.itens ?? [];
  const totalAlocado = useMemo(() => itens.reduce((s: number, i: any) => s + Number(i.valor_planejado), 0), [itens]);
  const renda = Number(planejamento?.renda_planejada ?? 0);
  const sobra = renda - totalAlocado;
  const pctAlocado = renda > 0 ? Math.min(100, Math.round((totalAlocado / renda) * 100)) : 0;

  const [modal, setModal] = useState<{ open: boolean; inicial?: ItemPlanejamentoEdit }>({ open: false });

  const delFn = useServerFn(excluirItemPlanejamento);
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Categoria removida"); qc.invalidateQueries({ queryKey: ["planejamento"] }); },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold">Planejamento mensal</h1>
          <p className="text-sm text-muted-foreground">
            Um espaço separado pra organizar pra onde o dinheiro do mês vai — não mexe nas suas transações reais.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => mudarMes(-1)} aria-label="Mês anterior">‹</Button>
          <Button variant="outline" disabled className="px-3 whitespace-nowrap">{MESES[mes - 1]}/{ano}</Button>
          <Button variant="outline" size="icon" onClick={() => mudarMes(1)} aria-label="Próximo mês">›</Button>
        </div>
      </header>

      {isLoading ? null : !planejamento ? (
        <SemPlanejamento mes={mes} ano={ano} onCriado={() => qc.invalidateQueries({ queryKey: ["planejamento", mes, ano] })} />
      ) : (
        <>
          <Card className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <RendaEditor id={planejamento.id} rendaAtual={renda} />
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Ainda dá pra alocar</p>
                <p className={`font-mono text-xl font-bold ${sobra < 0 ? "text-[color:var(--color-despesa)]" : "text-[color:var(--color-receita)]"}`}>
                  {formatBRL(sobra)}
                </p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pctAlocado}%`,
                  background: sobra < 0 ? "var(--color-despesa)" : "var(--color-receita)",
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {formatBRL(totalAlocado)} alocados de {formatBRL(renda)} planejados ({pctAlocado}%)
            </p>
          </Card>

          <Card>
            <div className="p-4 flex items-center justify-between border-b border-border">
              <p className="text-sm font-medium">Categorias deste planejamento</p>
              <Button size="sm" onClick={() => setModal({ open: true })}>
                <Plus className="w-4 h-4 mr-1" /> Nova categoria
              </Button>
            </div>
            {itens.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">
                Nenhuma categoria ainda. Adiciona uma pra começar a dividir os {formatBRL(renda)}.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {itens.map((i: any) => {
                  const pct = renda > 0 ? Math.round((Number(i.valor_planejado) / renda) * 100) : 0;
                  return (
                    <div key={i.id} className="p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <div className="flex items-center gap-3 min-w-0 basis-full sm:basis-auto sm:flex-1">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: i.cor }}>
                          <Wallet className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{i.nome}</div>
                          <div className="text-xs text-muted-foreground truncate">{pct}% da renda planejada</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 ml-auto">
                        <div className="font-mono font-semibold text-sm sm:text-base">{formatBRL(Number(i.valor_planejado))}</div>
                        <button
                          onClick={() => setModal({ open: true, inicial: { id: i.id, nome: i.nome, valor_planejado: Number(i.valor_planejado), cor: i.cor } })}
                          className="p-2 hover:bg-accent rounded"
                          aria-label="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirm("Remover esta categoria do planejamento?") && del.mutate(i.id)}
                          className="p-2 hover:bg-destructive/10 text-destructive rounded"
                          aria-label="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <ItemPlanejamentoModal
            open={modal.open}
            onOpenChange={(v) => setModal({ open: v })}
            planejamentoId={planejamento.id}
            inicial={modal.inicial}
          />
        </>
      )}
    </div>
  );
}

function SemPlanejamento({ mes, ano, onCriado }: { mes: number; ano: number; onCriado: () => void }) {
  const [renda, setRenda] = useState("");
  const iniciarFn = useServerFn(iniciarPlanejamento);
  const mut = useMutation({
    mutationFn: () => iniciarFn({ data: { mes, ano, renda_planejada: Number(renda.replace(",", ".")) || 0 } }),
    onSuccess: () => { toast.success("Planejamento criado"); onCriado(); },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });
  return (
    <Card className="p-8 text-center space-y-4">
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Você ainda não montou um planejamento pra {MESES[mes - 1]}/{ano}. Comece informando quanto pretende ter disponível
        pra organizar esse mês (não precisa ser exato — dá pra ajustar depois).
      </p>
      <div className="max-w-xs mx-auto space-y-2">
        <Input value={renda} onChange={(e) => setRenda(e.target.value)} placeholder="Ex: 5000,00" inputMode="decimal" />
        <Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? "Criando..." : "Começar planejamento deste mês"}
        </Button>
      </div>
    </Card>
  );
}

function RendaEditor({ id, rendaAtual }: { id: string; rendaAtual: number }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(String(rendaAtual));
  const qc = useQueryClient();
  const atualizarFn = useServerFn(atualizarRendaPlanejada);
  const mut = useMutation({
    mutationFn: () => atualizarFn({ data: { id, renda_planejada: Number(valor.replace(",", ".")) || 0 } }),
    onSuccess: () => { setEditando(false); qc.invalidateQueries({ queryKey: ["planejamento"] }); },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  if (editando) {
    return (
      <div className="flex items-center gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Renda planejada</p>
          <Input value={valor} onChange={(e) => setValor(e.target.value)} className="w-36" inputMode="decimal" autoFocus />
        </div>
        <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>Salvar</Button>
        <Button size="sm" variant="ghost" onClick={() => { setEditando(false); setValor(String(rendaAtual)); }}>Cancelar</Button>
      </div>
    );
  }
  return (
    <button onClick={() => setEditando(true)} className="text-left group">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Renda planejada</p>
      <p className="font-mono text-xl font-bold group-hover:underline">{formatBRL(rendaAtual)}</p>
    </button>
  );
}

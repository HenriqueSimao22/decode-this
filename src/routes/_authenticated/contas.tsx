import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listarContas,
  excluirConta,
  marcarPago,
  desmarcarPago,
} from "@/lib/contas.functions";
import { listarMembrosAtivos } from "@/lib/workspaces.functions";
import { AuthorBadge } from "@/components/livrocaixa/author-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContaModal, type ContaEdit } from "@/components/livrocaixa/conta-modal";
import { formatBRL } from "@/components/livrocaixa/transacao-modal";
import { Check, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/contas")({
  component: ContasPage,
});

function ContasPage() {
  const [ref, setRef] = useState(() => {
    const d = new Date();
    return { ano: d.getFullYear(), mes: d.getMonth() };
  });
  const [tipo, setTipo] = useState<"todos" | "pagar" | "receber">("todos");
  const [status, setStatus] = useState<"todas" | "pendentes" | "pagas" | "atrasadas">("pendentes");
  const [autorId, setAutorId] = useState<string>("todos");
  const [modal, setModal] = useState<{ open: boolean; inicial?: ContaEdit; tipoDefault?: "pagar" | "receber" }>({ open: false });

  const listFn = useServerFn(listarContas);
  const delFn = useServerFn(excluirConta);
  const pagarFn = useServerFn(marcarPago);
  const desmarcarFn = useServerFn(desmarcarPago);
  const membrosFn = useServerFn(listarMembrosAtivos);
  const qc = useQueryClient();

  const inicio = `${ref.ano}-${String(ref.mes + 1).padStart(2, "0")}-01`;
  const fimDate = new Date(ref.ano, ref.mes + 1, 0);
  const fim = `${ref.ano}-${String(ref.mes + 1).padStart(2, "0")}-${String(fimDate.getDate()).padStart(2, "0")}`;

  const { data: rows } = useQuery({
    queryKey: ["contas", inicio, fim, tipo, status, autorId],
    queryFn: () =>
      listFn({
        data: {
          tipo: tipo === "todos" ? undefined : tipo,
          status,
          inicio,
          fim,
          criadoPor: autorId === "todos" ? undefined : autorId,
        },
      }),
  });
  const { data: membros } = useQuery({ queryKey: ["membrosAtivos"], queryFn: () => membrosFn() });
  const membrosMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const x of membros ?? []) m.set(x.user_id, x);
    return m;
  }, [membros]);

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["contas"] });
    qc.invalidateQueries({ queryKey: ["resumoContas"] });
    qc.invalidateQueries({ queryKey: ["resumo"] });
    qc.invalidateQueries({ queryKey: ["transacoes"] });
  };

  const pagar = useMutation({
    mutationFn: (id: string) => pagarFn({ data: { id } }),
    onSuccess: () => { toast.success("Marcada como paga"); invalidar(); },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });
  const desmarcar = useMutation({
    mutationFn: (id: string) => desmarcarFn({ data: { id } }),
    onSuccess: () => { toast.success("Pagamento desfeito"); invalidar(); },
  });
  const del = useMutation({
    mutationFn: (v: { id: string; escopo: "uma" | "grupo" }) => delFn({ data: v }),
    onSuccess: () => { toast.success("Excluído"); invalidar(); },
  });

  const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  function mudarMes(delta: number) {
    setRef((r) => {
      const m = r.mes + delta;
      if (m < 0) return { ano: r.ano - 1, mes: 11 };
      if (m > 11) return { ano: r.ano + 1, mes: 0 };
      return { ano: r.ano, mes: m };
    });
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const totais = useMemo(() => {
    let pagar = 0, receber = 0;
    for (const r of rows ?? []) {
      if (r.pago_em) continue;
      const v = Number(r.valor);
      if (r.tipo === "pagar") pagar += v; else receber += v;
    }
    return { pagar, receber };
  }, [rows]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Contas a pagar e receber</h1>
          <p className="text-sm text-muted-foreground">Acompanhe vencimentos e marque como pago</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setModal({ open: true, tipoDefault: "pagar" })}
            style={{ backgroundColor: "var(--color-despesa)", color: "white" }}>+ A pagar</Button>
          <Button onClick={() => setModal({ open: true, tipoDefault: "receber" })}
            style={{ backgroundColor: "var(--color-receita)", color: "white" }}>+ A receber</Button>
        </div>
      </header>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mudarMes(-1)}>‹</Button>
          <span className="font-medium min-w-40 text-center">{MESES[ref.mes]} / {ref.ano}</span>
          <Button variant="outline" size="sm" onClick={() => mudarMes(1)}>›</Button>
          <div className="grow" />
          <div className="text-sm text-[color:var(--color-despesa)] font-mono">− {formatBRL(totais.pagar)}</div>
          <div className="text-sm text-[color:var(--color-receita)] font-mono">+ {formatBRL(totais.receber)}</div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total pendente a pagar</p>
          <p className="font-mono text-2xl font-bold mt-2 text-[color:var(--color-despesa)]">{formatBRL(totais.pagar)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total pendente a receber</p>
          <p className="font-mono text-2xl font-bold mt-2 text-[color:var(--color-receita)]">{formatBRL(totais.receber)}</p>
        </Card>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="pagar">A pagar</SelectItem>
            <SelectItem value="receber">A receber</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v: any) => setStatus(v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pendentes">Pendentes</SelectItem>
            <SelectItem value="atrasadas">Atrasadas</SelectItem>
            <SelectItem value="pagas">Pagas</SelectItem>
            <SelectItem value="todas">Todas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={autorId} onValueChange={setAutorId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as pessoas</SelectItem>
            {(membros ?? []).map((m) => (
              <SelectItem key={m.user_id} value={m.user_id}>{m.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="divide-y">
        {(rows ?? []).length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma conta encontrada.</div>
        )}
        {(rows ?? []).map((r) => {
          const cat = (r as any).categorias?.nome ?? "Sem categoria";
          const isPagar = r.tipo === "pagar";
          const pago = !!r.pago_em;
          const atrasada = !pago && r.vencimento < hoje;
          const cor = isPagar ? "var(--color-despesa)" : "var(--color-receita)";
          const autor = membrosMap.get((r as any).criado_por);
          return (
            <div key={r.id} className="p-4 flex items-center gap-4">
              <div className="w-2 h-10 rounded" style={{ background: pago ? "var(--muted-foreground)" : cor, opacity: pago ? 0.4 : 1 }} />
              <AuthorBadge autor={autor} />
              <div className="flex-1 min-w-0">
                <div className={`font-medium truncate ${pago ? "line-through opacity-60" : ""}`}>{r.descricao}</div>
                <div className="text-xs text-muted-foreground truncate">
                  Vence {new Date(r.vencimento + "T12:00").toLocaleDateString("pt-BR")} · {cat}
                  {autor && <> · por {autor.nome}</>}
                  {atrasada && <span className="ml-2 text-[color:var(--color-despesa)] font-medium">· atrasada</span>}
                  {pago && <span className="ml-2 text-[color:var(--color-receita)] font-medium">· paga</span>}
                  {r.grupo_recorrencia && <span className="ml-2">· recorrente</span>}
                </div>
              </div>
              <div className={`font-mono font-semibold ${pago ? "opacity-60" : ""}`} style={{ color: cor }}>
                {isPagar ? "− " : "+ "}{formatBRL(Number(r.valor))}
              </div>
              {!pago ? (
                <button onClick={() => pagar.mutate(r.id)} className="p-2 hover:bg-accent rounded" aria-label="Marcar como pago" title="Marcar como pago">
                  <Check className="w-4 h-4 text-[color:var(--color-receita)]" />
                </button>
              ) : (
                <button onClick={() => desmarcar.mutate(r.id)} className="p-2 hover:bg-accent rounded" aria-label="Desfazer pagamento" title="Desfazer pagamento">
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() =>
                  setModal({
                    open: true,
                    inicial: {
                      id: r.id,
                      tipo: r.tipo as "pagar" | "receber",
                      descricao: r.descricao,
                      valor: Number(r.valor),
                      vencimento: r.vencimento,
                      categoria_id: r.categoria_id,
                      observacao: r.observacao,
                    },
                  })
                }
                className="p-2 hover:bg-accent rounded"
                aria-label="Editar"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (r.grupo_recorrencia) {
                    const escopo = confirm("Esta conta faz parte de uma recorrência.\n\nOK = excluir TODAS as parcelas pendentes deste grupo\nCancelar = excluir apenas esta") ? "grupo" : "uma";
                    del.mutate({ id: r.id, escopo });
                  } else if (confirm("Excluir esta conta?")) {
                    del.mutate({ id: r.id, escopo: "uma" });
                  }
                }}
                className="p-2 hover:bg-destructive/10 text-destructive rounded"
                aria-label="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </Card>

      <ContaModal
        open={modal.open}
        onOpenChange={(v) => setModal({ open: v, inicial: v ? modal.inicial : undefined, tipoDefault: modal.tipoDefault })}
        inicial={modal.inicial}
        tipoDefault={modal.tipoDefault}
      />
    </div>
  );
}
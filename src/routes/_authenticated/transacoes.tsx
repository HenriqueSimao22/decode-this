import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listarTransacoes,
  listarCategorias,
  excluirTransacao,
} from "@/lib/livrocaixa.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransacaoModal, formatBRL, type TransacaoEdit } from "@/components/livrocaixa/transacao-modal";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/transacoes")({
  component: TransacoesPage,
});

function TransacoesPage() {
  const [ref, setRef] = useState(() => {
    const d = new Date();
    return { ano: d.getFullYear(), mes: d.getMonth() };
  });
  const [tipo, setTipo] = useState<"todos" | "receita" | "despesa">("todos");
  const [categoriaId, setCategoriaId] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState<{ open: boolean; inicial?: TransacaoEdit }>({ open: false });

  const listFn = useServerFn(listarTransacoes);
  const catFn = useServerFn(listarCategorias);
  const delFn = useServerFn(excluirTransacao);
  const qc = useQueryClient();

  const inicio = `${ref.ano}-${String(ref.mes + 1).padStart(2, "0")}-01`;
  const fimDate = new Date(ref.ano, ref.mes + 1, 0);
  const fim = `${ref.ano}-${String(ref.mes + 1).padStart(2, "0")}-${String(fimDate.getDate()).padStart(2, "0")}`;

  const { data: rows } = useQuery({
    queryKey: ["transacoes", inicio, fim, tipo, categoriaId, busca],
    queryFn: () =>
      listFn({
        data: {
          inicio,
          fim,
          tipo: tipo === "todos" ? undefined : tipo,
          categoriaId: categoriaId === "todas" ? undefined : categoriaId,
          busca: busca || undefined,
        },
      }),
  });
  const { data: cats } = useQuery({ queryKey: ["categorias"], queryFn: () => catFn() });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Transação excluída");
      qc.invalidateQueries({ queryKey: ["transacoes"] });
      qc.invalidateQueries({ queryKey: ["resumo"] });
    },
  });

  const totais = useMemo(() => {
    let r = 0, d = 0;
    for (const t of rows ?? []) {
      if (t.tipo === "receita") r += Number(t.valor);
      else d += Number(t.valor);
    }
    return { r, d };
  }, [rows]);

  const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  function mudarMes(delta: number) {
    setRef((r) => {
      const m = r.mes + delta;
      if (m < 0) return { ano: r.ano - 1, mes: 11 };
      if (m > 11) return { ano: r.ano + 1, mes: 0 };
      return { ano: r.ano, mes: m };
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Receitas e despesas</h1>
          <p className="text-sm text-muted-foreground">Todas as suas movimentações</p>
        </div>
        <Button onClick={() => setModal({ open: true })}>+ Nova transação</Button>
      </header>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mudarMes(-1)}>‹</Button>
          <span className="font-medium min-w-40 text-center">{MESES[ref.mes]} / {ref.ano}</span>
          <Button variant="outline" size="sm" onClick={() => mudarMes(1)}>›</Button>
          <div className="grow" />
          <div className="text-sm text-[color:var(--color-receita)] font-mono">+ {formatBRL(totais.r)}</div>
          <div className="text-sm text-[color:var(--color-despesa)] font-mono">− {formatBRL(totais.d)}</div>
        </div>
      </Card>

      <div className="grid gap-2 md:grid-cols-3">
        <Input placeholder="Buscar descrição..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="receita">Receitas</SelectItem>
            <SelectItem value="despesa">Despesas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoriaId} onValueChange={setCategoriaId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {(cats ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="divide-y">
        {(rows ?? []).length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma transação neste período.</div>
        )}
        {(rows ?? []).map((t) => {
          const cat = (t as any).categorias?.nome ?? "Sem categoria";
          const isReceita = t.tipo === "receita";
          return (
            <div key={t.id} className="p-4 flex items-center gap-4">
              <div
                className="w-2 h-10 rounded"
                style={{ background: isReceita ? "var(--color-receita)" : "var(--color-despesa)" }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{t.descricao}</div>
                <div className="text-xs text-muted-foreground">{new Date(t.data + "T12:00").toLocaleDateString("pt-BR")} · {cat}</div>
              </div>
              <div className={`font-mono font-semibold ${isReceita ? "text-[color:var(--color-receita)]" : "text-[color:var(--color-despesa)]"}`}>
                {isReceita ? "+ " : "− "}{formatBRL(Number(t.valor))}
              </div>
              <button
                onClick={() =>
                  setModal({
                    open: true,
                    inicial: {
                      id: t.id,
                      tipo: t.tipo as "receita" | "despesa",
                      descricao: t.descricao,
                      valor: Number(t.valor),
                      categoria_id: t.categoria_id,
                      data: t.data,
                      observacao: t.observacao,
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
                  if (confirm("Excluir esta transação?")) del.mutate(t.id);
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

      <TransacaoModal
        open={modal.open}
        onOpenChange={(v) => setModal({ open: v, inicial: v ? modal.inicial : undefined })}
        inicial={modal.inicial}
      />
    </div>
  );
}
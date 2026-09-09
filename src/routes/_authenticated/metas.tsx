import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarMetas, excluirMeta, registrarAporte, arquivarMeta } from "@/lib/metas.functions";
import { MetaModal, type MetaEdit } from "@/components/livrocaixa/meta-modal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/components/livrocaixa/transacao-modal";
import { Plus, Pencil, Trash2, PiggyBank, TrendingDown, PartyPopper, Archive } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({ meta: [{ title: "Metas — Livro Caixa" }] }),
  component: MetasPage,
});

function MetasPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listarMetas);
  const delFn = useServerFn(excluirMeta);
  const arquivarFn = useServerFn(arquivarMeta);
  const { data: metas } = useQuery({ queryKey: ["metas"], queryFn: () => listFn() });

  const [modal, setModal] = useState<{ open: boolean; inicial?: MetaEdit }>({ open: false });
  const [aporteMeta, setAporteMeta] = useState<{ id: string; nome: string; modoInicial: "aporte" | "retirada" } | null>(null);

  const invalidar = () => { qc.invalidateQueries({ queryKey: ["metas"] }); qc.invalidateQueries({ queryKey: ["resumoMetas"] }); };
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Meta excluída"); invalidar(); },
  });
  const arquivar = useMutation({
    mutationFn: (id: string) => arquivarFn({ data: { id, arquivada: true } }),
    onSuccess: () => { toast.success("Meta arquivada"); invalidar(); },
  });

  const concluidas = (metas ?? []).filter((m: any) => m.concluida).length;
  const totalEconomizado = (metas ?? [])
    .filter((m: any) => m.tipo === "economia")
    .reduce((a: number, m: any) => a + Number(m.valor_atual_calculado), 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Metas</h1>
          <p className="text-sm text-muted-foreground">Economize para objetivos ou controle o teto de gasto por categoria</p>
        </div>
        <Button onClick={() => setModal({ open: true })}>
          <Plus className="w-4 h-4 mr-1" /> Nova meta
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--color-receita)" }}>
            <PiggyBank className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total economizado nas metas</p>
            <p className="font-mono text-xl font-bold">{formatBRL(totalEconomizado)}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--dourado)" }}>
            <PartyPopper className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Metas concluídas</p>
            <p className="font-mono text-xl font-bold">{concluidas} de {(metas ?? []).length}</p>
          </div>
        </Card>
      </div>

      {(metas ?? []).length === 0 && (
        <Card className="p-10 text-center">
          <PiggyBank className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma meta criada ainda.</p>
          <Button className="mt-4" onClick={() => setModal({ open: true })}>Criar minha primeira meta</Button>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(metas ?? []).map((m: any) => {
          const pct = m.progresso_pct;
          const estourou = m.tipo === "gasto_maximo" && m.valor_atual_calculado > Number(m.valor_alvo);
          return (
            <Card key={m.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {m.tipo === "gasto_maximo" ? <TrendingDown className="w-4 h-4 shrink-0" style={{ color: m.cor }} /> : <PiggyBank className="w-4 h-4 shrink-0" style={{ color: m.cor }} />}
                    <p className="font-serif font-semibold truncate">{m.nome}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {m.tipo === "economia" ? "Meta de economia" : `Limite mensal · ${m.categorias?.nome ?? "categoria"}`}
                    {m.prazo && <> · até {new Date(m.prazo + "T12:00").toLocaleDateString("pt-BR")}</>}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setModal({ open: true, inicial: { id: m.id, nome: m.nome, tipo: m.tipo, categoria_id: m.categoria_id, valor_alvo: Number(m.valor_alvo), cor: m.cor, icone: m.icone, prazo: m.prazo } })} className="p-1.5 hover:bg-accent rounded" aria-label="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => confirm("Excluir esta meta?") && del.mutate(m.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded" aria-label="Excluir">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <div className="h-2 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all"
                    style={{ width: `${pct}%`, background: estourou ? "var(--color-despesa)" : m.cor }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <span className="font-mono" style={{ color: estourou ? "var(--color-despesa)" : undefined }}>
                    {formatBRL(m.valor_atual_calculado)}
                  </span>
                  <span className="text-muted-foreground">de {formatBRL(Number(m.valor_alvo))}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Badge variant={m.concluida ? "default" : estourou ? "destructive" : "outline"}
                  className={m.concluida ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0" : ""}>
                  {m.concluida ? "Concluída 🎉" : estourou ? "Limite estourado" : `${pct}%`}
                </Badge>
                {m.tipo === "economia" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setAporteMeta({ id: m.id, nome: m.nome, modoInicial: "aporte" })}>
                      + Aporte
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setAporteMeta({ id: m.id, nome: m.nome, modoInicial: "retirada" })}>
                      − Retirada
                    </Button>
                  </div>
                )}
                {m.concluida && (
                  <button onClick={() => arquivar.mutate(m.id)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                    <Archive className="w-3 h-3" /> Arquivar
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <MetaModal open={modal.open} onOpenChange={(v) => setModal({ open: v, inicial: v ? modal.inicial : undefined })} inicial={modal.inicial} />
      {aporteMeta && (
        <AporteDialog meta={aporteMeta} onClose={() => setAporteMeta(null)} onDone={invalidar} />
      )}
    </div>
  );
}

function AporteDialog({ meta, onClose, onDone }: { meta: { id: string; nome: string; modoInicial: "aporte" | "retirada" }; onClose: () => void; onDone: () => void }) {
  const aporteFn = useServerFn(registrarAporte);
  const [valor, setValor] = useState("");
  const [tipoMov, setTipoMov] = useState<"aporte" | "retirada">(meta.modoInicial);

  const mut = useMutation({
    mutationFn: () => {
      const v = Number(valor.replace(",", "."));
      return aporteFn({ data: { meta_id: meta.id, valor: tipoMov === "aporte" ? v : -v } });
    },
    onSuccess: (res: any) => {
      toast.success(res.concluida ? "Meta concluída! 🎉" : "Aporte registrado");
      onDone();
      onClose();
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-serif text-xl">{meta.nome}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant={tipoMov === "aporte" ? "default" : "outline"} size="sm" onClick={() => setTipoMov("aporte")} className="flex-1">Adicionar</Button>
            <Button variant={tipoMov === "retirada" ? "default" : "outline"} size="sm" onClick={() => setTipoMov("retirada")} className="flex-1">Retirar</Button>
          </div>
          <div>
            <Label>Valor</Label>
            <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" autoFocus />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => mut.mutate()} disabled={!valor || Number(valor.replace(",", ".")) <= 0 || mut.isPending}>
              {mut.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  verFatura,
  listarFaturasCartao,
  excluirCompraCartao,
  pagarFatura,
  desfazerPagamentoFatura,
  excluirCartao,
  arquivarCartao,
} from "@/lib/cartoes.functions";
import { listarMembrosAtivos } from "@/lib/workspaces.functions";
import { listarCategorias } from "@/lib/livrocaixa.functions";
import { AuthorBadge } from "@/components/livrocaixa/author-badge";
import { CartaoModal } from "@/components/livrocaixa/cartao-modal";
import { CompraCartaoModal } from "@/components/livrocaixa/compra-cartao-modal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/components/livrocaixa/transacao-modal";
import { getBanco, BANDEIRAS } from "@/lib/bancos";
import { ArrowLeft, Trash2, Pencil, Plus, RotateCcw, CheckCircle2, Archive, ArchiveRestore, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cartoes/$id")({
  head: () => ({ meta: [{ title: "Cartão — Livro Caixa" }] }),
  component: CartaoDetalhe,
});

function CartaoDetalhe() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ref, setRef] = useState(() => {
    const d = new Date();
    return { ano: d.getFullYear(), mes: d.getMonth() };
  });
  const [busca, setBusca] = useState("");
  const mesRef = `${ref.ano}-${String(ref.mes + 1).padStart(2, "0")}-01`;

  const verFn = useServerFn(verFatura);
  const membrosFn = useServerFn(listarMembrosAtivos);
  const delCompra = useServerFn(excluirCompraCartao);
  const pagarFn = useServerFn(pagarFatura);
  const desfazerFn = useServerFn(desfazerPagamentoFatura);
  const excluirFn = useServerFn(excluirCartao);
  const arquivarFn = useServerFn(arquivarCartao);

  const { data: fatData } = useQuery({
    queryKey: ["fatura", id, mesRef],
    queryFn: () => verFn({ data: { cartao_id: id, mes_referencia: mesRef } }),
  });
  const { data: membros } = useQuery({ queryKey: ["membrosAtivos"], queryFn: () => membrosFn() });
  const membrosMap = useMemo(() => new Map((membros ?? []).map((m: any) => [m.user_id, m])), [membros]);

  const [novaCompra, setNovaCompra] = useState(false);
  const [editar, setEditar] = useState(false);
  const [pagar, setPagar] = useState(false);

  const del = useMutation({
    mutationFn: (v: { id: string; escopo: "uma" | "grupo" }) => delCompra({ data: v }),
    onSuccess: () => { toast.success("Excluído"); qc.invalidateQueries({ queryKey: ["fatura"] }); qc.invalidateQueries({ queryKey: ["cartoes"] }); },
  });
  const desfazer = useMutation({
    mutationFn: () => desfazerFn({ data: { fatura_id: fatData!.fatura!.id! } }),
    onSuccess: () => { toast.success("Pagamento desfeito"); qc.invalidateQueries({ queryKey: ["fatura"] }); qc.invalidateQueries({ queryKey: ["cartoes"] }); qc.invalidateQueries({ queryKey: ["transacoes"] }); },
  });
  const excluir = useMutation({
    mutationFn: () => excluirFn({ data: { id } }),
    onSuccess: () => { toast.success("Cartão excluído"); navigate({ to: "/cartoes" }); },
  });
  const arquivar = useMutation({
    mutationFn: (ativo: boolean) => arquivarFn({ data: { id, ativo } }),
    onSuccess: () => { toast.success("Atualizado"); qc.invalidateQueries({ queryKey: ["fatura"] }); qc.invalidateQueries({ queryKey: ["cartoes"] }); },
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

  const cartao = fatData?.cartao;
  const fatura = fatData?.fatura;
  const linhas = fatData?.linhas ?? [];
  const linhasFiltradas = useMemo(
    () => linhas.filter((l: any) => l.descricao.toLowerCase().includes(busca.trim().toLowerCase())),
    [linhas, busca],
  );
  const total = fatData?.total ?? 0;
  const totalEmAberto = fatData?.total_em_aberto ?? total;
  const banco = cartao ? getBanco(cartao.banco) : null;
  const bandeiraNome = (c: string) => BANDEIRAS.find((b) => b.codigo === c)?.nome ?? c;
  const hoje = new Date().toISOString().slice(0, 10);
  const podePagar = fatura && fatura.id && fatura.status !== "paga" && total > 0;
  const excedeuLimite = !!cartao && cartao.limite != null && totalEmAberto > Number(cartao.limite);

  if (!cartao) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6">
      <Link to="/cartoes" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Voltar aos cartões
      </Link>

      <Card
        className="p-6 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${cartao.cor} 0%, ${cartao.cor}cc 100%)` }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide opacity-80">{banco?.nome}</p>
            <h1 className="font-serif text-2xl font-semibold">{cartao.nome}</h1>
            <p className="text-xs opacity-80 mt-1">
              {bandeiraNome(cartao.bandeira)} · Fecha dia {cartao.dia_fechamento} · Vence dia {cartao.dia_vencimento}
            </p>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20" onClick={() => setEditar(true)} title="Editar">
              <Pencil className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20"
              onClick={() => arquivar.mutate(!cartao.ativo)} title={cartao.ativo ? "Arquivar" : "Reativar"}>
              {cartao.ativo ? <Archive className="w-4 h-4" /> : <ArchiveRestore className="w-4 h-4" />}
            </Button>
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20"
              onClick={() => {
                if (confirm("Excluir este cartão? Todas as faturas e compras serão apagadas.")) excluir.mutate();
              }}
              title="Excluir">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {cartao.limite ? (
          <p className="text-xs opacity-70 mt-3">Limite: <span className="font-mono">{formatBRL(Number(cartao.limite))}</span></p>
        ) : null}
      </Card>

      {cartao.bloqueado && (
        <Card className="p-4 flex items-center gap-3 border-[color:var(--color-destructive)] bg-[color:var(--color-destructive)]/10">
          <AlertTriangle className="w-5 h-5 shrink-0 text-[color:var(--color-destructive)]" />
          <div className="text-sm">
            <p className="font-medium text-[color:var(--color-destructive)]">Cartão bloqueado — limite excedido</p>
            <p className="text-muted-foreground">Pague a fatura para liberar novas compras neste cartão.</p>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mudarMes(-1)}>‹</Button>
          <span className="font-medium min-w-40 text-center">{MESES[ref.mes]} / {ref.ano}</span>
          <Button variant="outline" size="sm" onClick={() => mudarMes(1)}>›</Button>
          <div className="grow" />
          <div className="text-sm text-muted-foreground">
            Fecha {new Date(fatura!.data_fechamento + "T12:00").toLocaleDateString("pt-BR")} · Vence {new Date(fatura!.data_vencimento + "T12:00").toLocaleDateString("pt-BR")}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total da fatura</p>
          <p className={`font-mono text-2xl font-bold mt-2 ${excedeuLimite ? "text-[color:var(--color-destructive)]" : ""}`}>
            {excedeuLimite ? "− " : ""}{formatBRL(total)}
          </p>
          {excedeuLimite && (
            <p className="text-xs text-[color:var(--color-destructive)] mt-1">
              Excede o limite em {formatBRL(totalEmAberto - Number(cartao.limite))}
            </p>
          )}
          <div className="mt-2 flex gap-2">
            {fatura!.status === "paga" ? <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Paga</Badge>
              : fatura!.data_fechamento <= hoje ? <Badge variant="secondary">Fechada</Badge>
              : <Badge variant="outline">Em aberto</Badge>}
            {cartao.bloqueado && <Badge variant="destructive">Bloqueado</Badge>}
          </div>
        </Card>
        <Card className="p-5 md:col-span-2 flex items-center gap-2 flex-wrap">
          <Button onClick={() => setNovaCompra(true)} disabled={cartao.bloqueado} title={cartao.bloqueado ? "Cartão bloqueado por limite excedido" : undefined}>
            <Plus className="w-4 h-4 mr-1" /> Nova compra
          </Button>
          {podePagar && <Button variant="outline" onClick={() => setPagar(true)}><CheckCircle2 className="w-4 h-4 mr-1" /> Pagar fatura</Button>}
          {fatura!.status === "paga" && (
            <Button variant="outline" onClick={() => confirm("Desfazer o pagamento desta fatura?") && desfazer.mutate()}>
              <RotateCcw className="w-4 h-4 mr-1" /> Desfazer pagamento
            </Button>
          )}
        </Card>
      </div>

      <Input
        placeholder="Buscar compra por descrição..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <Card className="divide-y">
        {linhasFiltradas.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {busca ? "Nenhuma compra encontrada para essa busca." : "Nenhuma compra nesta fatura."}
          </div>
        )}
        {linhasFiltradas.map((l: any) => {
          const autor = membrosMap.get(l.criado_por);
          const cat = l.categorias?.nome;
          const parcelaLabel = l.parcelas_total > 1 ? ` · ${l.parcela_atual}/${l.parcelas_total}` : "";
          return (
            <div key={l.id} className="p-4 flex items-center gap-4">
              <div className="w-2 h-10 rounded" style={{ background: "var(--color-despesa)" }} />
              <AuthorBadge autor={autor as any} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{l.descricao}{parcelaLabel}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {new Date(l.data_compra + "T12:00").toLocaleDateString("pt-BR")}
                  {cat && <> · {cat}</>}
                  {autor && <> · por {(autor as any).nome}</>}
                </div>
              </div>
              <div className="font-mono font-semibold text-[color:var(--color-despesa)]">− {formatBRL(Number(l.valor_parcela))}</div>
              <button
                onClick={() => {
                  const escopoGrupo = l.parcelas_total > 1
                    ? confirm(`Compra parcelada em ${l.parcelas_total}x.\n\nOK = excluir TODAS as parcelas\nCancelar = excluir só esta`)
                    : true;
                  if (l.parcelas_total === 1 && !confirm("Excluir esta compra?")) return;
                  del.mutate({ id: l.id, escopo: escopoGrupo ? "grupo" : "uma" });
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

      <CartaoModal
        open={editar}
        onOpenChange={setEditar}
        inicial={{
          id: cartao.id,
          nome: cartao.nome,
          banco: cartao.banco,
          bandeira: cartao.bandeira,
          cor: cartao.cor,
          limite: cartao.limite,
          dia_fechamento: cartao.dia_fechamento,
          dia_vencimento: cartao.dia_vencimento,
        }}
      />
      <CompraCartaoModal open={novaCompra} onOpenChange={setNovaCompra} cartaoId={cartao.id} />
      {fatura?.id && (
        <PagarFaturaDialog
          open={pagar}
          onOpenChange={setPagar}
          faturaId={fatura.id}
          totalPadrao={total}
          pagarFn={pagarFn as any}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["fatura"] });
            qc.invalidateQueries({ queryKey: ["cartoes"] });
            qc.invalidateQueries({ queryKey: ["transacoes"] });
          }}
        />
      )}
    </div>
  );
}

function PagarFaturaDialog({
  open,
  onOpenChange,
  faturaId,
  totalPadrao,
  pagarFn,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  faturaId: string;
  totalPadrao: number;
  pagarFn: any;
  onDone: () => void;
}) {
  const catFn = useServerFn(listarCategorias);
  const { data: cats } = useQuery({ queryKey: ["categorias"], queryFn: () => catFn() });
  const [dataPag, setDataPag] = useState(new Date().toISOString().slice(0, 10));
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const catsDespesa = (cats ?? []).filter((c: any) => c.tipo === "despesa");

  const mut = useMutation({
    mutationFn: () => pagarFn({ data: { fatura_id: faturaId, data_pagamento: dataPag, categoria_id: categoriaId } }),
    onSuccess: () => { toast.success("Fatura paga"); onDone(); onOpenChange(false); },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-serif text-xl">Pagar fatura</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Valor: <span className="font-mono font-semibold">{formatBRL(totalPadrao)}</span>. Uma despesa será registrada no dia informado.
          </p>
          <div>
            <Label>Data do pagamento</Label>
            <Input type="date" value={dataPag} onChange={(e) => setDataPag(e.target.value)} />
          </div>
          <div>
            <Label>Categoria da despesa (opcional)</Label>
            <Select value={categoriaId ?? "none"} onValueChange={(v) => setCategoriaId(v === "none" ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {catsDespesa.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Pagando..." : "Confirmar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listarCategorias,
  criarTransacao,
  atualizarTransacao,
} from "@/lib/livrocaixa.functions";
import { listarCartoes, lancarCompraCartao } from "@/lib/cartoes.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export type TransacaoEdit = {
  id?: string;
  tipo: "receita" | "despesa";
  descricao: string;
  valor: number;
  categoria_id: string | null;
  data: string;
  observacao: string | null;
};

export function TransacaoModal({
  open,
  onOpenChange,
  inicial,
  tipoDefault = "despesa",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  inicial?: TransacaoEdit;
  tipoDefault?: "receita" | "despesa";
}) {
  const qc = useQueryClient();
  const catFn = useServerFn(listarCategorias);
  const criarFn = useServerFn(criarTransacao);
  const atualizarFn = useServerFn(atualizarTransacao);
  const cartoesFn = useServerFn(listarCartoes);
  const compraCartaoFn = useServerFn(lancarCompraCartao);
  const { data: cats } = useQuery({ queryKey: ["categorias"], queryFn: () => catFn() });
  const { data: cartoes } = useQuery({ queryKey: ["cartoes"], queryFn: () => cartoesFn() });

  const [tipo, setTipo] = useState<"receita" | "despesa">(inicial?.tipo ?? tipoDefault);
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [valor, setValor] = useState(inicial?.valor?.toString() ?? "");
  const [data, setData] = useState(inicial?.data ?? new Date().toISOString().slice(0, 10));
  const [categoriaId, setCategoriaId] = useState<string | null>(inicial?.categoria_id ?? null);
  const [observacao, setObservacao] = useState(inicial?.observacao ?? "");
  // Meio de pagamento: "conta" (padrão) ou id do cartão. Só para NOVA despesa.
  const [meio, setMeio] = useState<string>("conta");
  const [parcelas, setParcelas] = useState("1");

  useEffect(() => {
    if (open) {
      setTipo(inicial?.tipo ?? tipoDefault);
      setDescricao(inicial?.descricao ?? "");
      setValor(inicial?.valor?.toString() ?? "");
      setData(inicial?.data ?? new Date().toISOString().slice(0, 10));
      setCategoriaId(inicial?.categoria_id ?? null);
      setObservacao(inicial?.observacao ?? "");
      setMeio("conta");
      setParcelas("1");
    }
  }, [open, inicial, tipoDefault]);

  const isNovaDespesaNoCartao = !inicial?.id && tipo === "despesa" && meio !== "conta";
  const cartoesAtivos = (cartoes ?? []).filter((c: any) => c.ativo !== false);

  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        tipo,
        descricao: descricao.trim(),
        valor: Number(valor.replace(",", ".")),
        data,
        categoria_id: categoriaId,
        observacao: observacao.trim() || null,
      };
      if (inicial?.id) {
        await atualizarFn({ data: { id: inicial.id, ...payload } });
        return "transacao";
      }
      if (isNovaDespesaNoCartao) {
        const p = Math.max(1, Math.min(48, Number(parcelas) || 1));
        await compraCartaoFn({
          data: {
            cartao_id: meio,
            descricao: payload.descricao,
            valor_total: payload.valor,
            data_compra: payload.data,
            parcelas: p,
            categoria_id: payload.categoria_id,
            observacao: payload.observacao,
          },
        });
        return "cartao";
      }
      await criarFn({ data: payload });
      return "transacao";
    },
    onSuccess: (kind) => {
      toast.success(
        inicial?.id
          ? "Transação atualizada"
          : kind === "cartao"
            ? "Compra lançada no cartão"
            : "Transação registrada",
      );
      qc.invalidateQueries({ queryKey: ["transacoes"] });
      qc.invalidateQueries({ queryKey: ["resumo"] });
      qc.invalidateQueries({ queryKey: ["cartoes"] });
      qc.invalidateQueries({ queryKey: ["fatura"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const catsFiltradas = (cats ?? []).filter((c) => c.tipo === tipo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">
            {inicial?.id ? "Editar" : "Nova"} {tipo === "receita" ? "receita" : "despesa"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
          className="space-y-4"
        >
          <div className="flex gap-2">
            <Button
              type="button"
              variant={tipo === "receita" ? "default" : "outline"}
              onClick={() => setTipo("receita")}
              className="flex-1"
              style={tipo === "receita" ? { backgroundColor: "var(--color-receita)", color: "white" } : undefined}
            >
              ↑ Receita
            </Button>
            <Button
              type="button"
              variant={tipo === "despesa" ? "default" : "outline"}
              onClick={() => setTipo("despesa")}
              className="flex-1"
              style={tipo === "despesa" ? { backgroundColor: "var(--color-despesa)", color: "white" } : undefined}
            >
              ↓ Despesa
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input required maxLength={200} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input
                required
                inputMode="decimal"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" required value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={categoriaId ?? "__none"} onValueChange={(v) => setCategoriaId(v === "__none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sem categoria</SelectItem>
                {catsFiltradas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Observação</Label>
            <Textarea maxLength={500} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
          {!inicial?.id && tipo === "despesa" && (
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
              <div className="space-y-1.5">
                <Label>Meio de pagamento</Label>
                <Select value={meio} onValueChange={setMeio}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conta">À vista / conta</SelectItem>
                    {cartoesAtivos.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>💳 {c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isNovaDespesaNoCartao && (
                <div className="space-y-1.5">
                  <Label>Parcelas</Label>
                  <Input
                    type="number"
                    min={1}
                    max={48}
                    value={parcelas}
                    onChange={(e) => setParcelas(e.target.value)}
                  />
                </div>
              )}
              {isNovaDespesaNoCartao && Number(valor.replace(",", ".")) > 0 && Number(parcelas) > 1 && (
                <div className="col-span-2 text-xs text-muted-foreground bg-accent/40 rounded p-2">
                  {parcelas}× de{" "}
                  <span className="font-mono font-semibold">
                    {formatBRL(Number(valor.replace(",", ".")) / Number(parcelas))}
                  </span>
                  . Entrará automaticamente na fatura de cada mês.
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
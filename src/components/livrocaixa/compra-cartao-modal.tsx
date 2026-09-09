import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lancarCompraCartao } from "@/lib/cartoes.functions";
import { listarCategorias } from "@/lib/livrocaixa.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL } from "@/components/livrocaixa/transacao-modal";
import { toast } from "sonner";

export function CompraCartaoModal({
  open,
  onOpenChange,
  cartaoId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cartaoId: string;
}) {
  const qc = useQueryClient();
  const catFn = useServerFn(listarCategorias);
  const lancarFn = useServerFn(lancarCompraCartao);
  const { data: cats } = useQuery({ queryKey: ["categorias"], queryFn: () => catFn() });

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [parcelas, setParcelas] = useState("1");
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [obs, setObs] = useState("");

  useEffect(() => {
    if (!open) return;
    setDescricao(""); setValor(""); setData(new Date().toISOString().slice(0, 10));
    setParcelas("1"); setCategoriaId(null); setObs("");
  }, [open]);

  const totalNum = Number((valor || "0").replace(",", "."));
  const parcNum = Math.max(1, Math.min(48, Number(parcelas) || 1));
  const valorParcela = useMemo(() => (totalNum > 0 ? totalNum / parcNum : 0), [totalNum, parcNum]);

  const catsDespesa = (cats ?? []).filter((c: any) => c.tipo === "despesa");

  const mut = useMutation({
    mutationFn: () =>
      lancarFn({
        data: {
          cartao_id: cartaoId,
          descricao: descricao.trim(),
          valor_total: totalNum,
          data_compra: data,
          parcelas: parcNum,
          categoria_id: categoriaId,
          observacao: obs.trim() || null,
        },
      }),
    onSuccess: (res: any) => {
      if (res?.bloqueado) {
        toast.warning("Limite excedido — cartão bloqueado", {
          description: "A compra foi lançada, mas o limite foi ultrapassado. Novas compras ficarão bloqueadas até o pagamento da fatura.",
        });
      } else {
        toast.success("Compra lançada");
      }
      qc.invalidateQueries({ queryKey: ["fatura"] });
      qc.invalidateQueries({ queryKey: ["cartoes"] });
      qc.invalidateQueries({ queryKey: ["faturas"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Nova compra no cartão</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Mercado, Netflix..." maxLength={200} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor total</Label>
              <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" />
            </div>
            <div>
              <Label>Data da compra</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Parcelas</Label>
              <Input type="number" min={1} max={48} value={parcelas} onChange={(e) => setParcelas(e.target.value)} />
            </div>
            <div>
              <Label>Categoria</Label>
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
          </div>
          {parcNum > 1 && totalNum > 0 && (
            <div className="text-xs text-muted-foreground bg-accent/50 rounded p-2">
              {parcNum}× de <span className="font-mono font-semibold">{formatBRL(valorParcela)}</span>
              {" "}= <span className="font-mono">{formatBRL(totalNum)}</span>. Cada parcela entra na fatura do mês correspondente.
            </div>
          )}
          <div>
            <Label>Observações</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} maxLength={500} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => mut.mutate()} disabled={!descricao.trim() || totalNum <= 0 || mut.isPending}>
              {mut.isPending ? "Lançando..." : "Lançar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
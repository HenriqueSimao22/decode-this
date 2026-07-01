import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listarCategorias,
  criarTransacao,
  atualizarTransacao,
} from "@/lib/livrocaixa.functions";
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
  const { data: cats } = useQuery({ queryKey: ["categorias"], queryFn: () => catFn() });

  const [tipo, setTipo] = useState<"receita" | "despesa">(inicial?.tipo ?? tipoDefault);
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [valor, setValor] = useState(inicial?.valor?.toString() ?? "");
  const [data, setData] = useState(inicial?.data ?? new Date().toISOString().slice(0, 10));
  const [categoriaId, setCategoriaId] = useState<string | null>(inicial?.categoria_id ?? null);
  const [observacao, setObservacao] = useState(inicial?.observacao ?? "");

  useEffect(() => {
    if (open) {
      setTipo(inicial?.tipo ?? tipoDefault);
      setDescricao(inicial?.descricao ?? "");
      setValor(inicial?.valor?.toString() ?? "");
      setData(inicial?.data ?? new Date().toISOString().slice(0, 10));
      setCategoriaId(inicial?.categoria_id ?? null);
      setObservacao(inicial?.observacao ?? "");
    }
  }, [open, inicial, tipoDefault]);

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
      if (inicial?.id) await atualizarFn({ data: { id: inicial.id, ...payload } });
      else await criarFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(inicial?.id ? "Transação atualizada" : "Transação registrada");
      qc.invalidateQueries({ queryKey: ["transacoes"] });
      qc.invalidateQueries({ queryKey: ["resumo"] });
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
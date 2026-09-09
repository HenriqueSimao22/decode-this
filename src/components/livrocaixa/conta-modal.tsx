import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarCategorias } from "@/lib/livrocaixa.functions";
import { criarConta, atualizarConta } from "@/lib/contas.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export type ContaEdit = {
  id?: string;
  tipo: "pagar" | "receber";
  descricao: string;
  valor: number;
  vencimento: string;
  categoria_id: string | null;
  observacao: string | null;
};

export function ContaModal({
  open,
  onOpenChange,
  inicial,
  tipoDefault = "pagar",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  inicial?: ContaEdit;
  tipoDefault?: "pagar" | "receber";
}) {
  const qc = useQueryClient();
  const catFn = useServerFn(listarCategorias);
  const criarFn = useServerFn(criarConta);
  const atualizarFn = useServerFn(atualizarConta);
  const { data: cats } = useQuery({ queryKey: ["categorias"], queryFn: () => catFn() });

  const [tipo, setTipo] = useState<"pagar" | "receber">(inicial?.tipo ?? tipoDefault);
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [valor, setValor] = useState(inicial?.valor?.toString() ?? "");
  const [vencimento, setVencimento] = useState(inicial?.vencimento ?? new Date().toISOString().slice(0, 10));
  const [categoriaId, setCategoriaId] = useState<string | null>(inicial?.categoria_id ?? null);
  const [observacao, setObservacao] = useState(inicial?.observacao ?? "");
  const [recorrencia, setRecorrencia] = useState<"nenhuma" | "semanal" | "mensal" | "anual">("nenhuma");
  const [ocorrencias, setOcorrencias] = useState("12");

  useEffect(() => {
    if (open) {
      setTipo(inicial?.tipo ?? tipoDefault);
      setDescricao(inicial?.descricao ?? "");
      setValor(inicial?.valor?.toString() ?? "");
      setVencimento(inicial?.vencimento ?? new Date().toISOString().slice(0, 10));
      setCategoriaId(inicial?.categoria_id ?? null);
      setObservacao(inicial?.observacao ?? "");
      setRecorrencia("nenhuma");
      setOcorrencias("12");
    }
  }, [open, inicial, tipoDefault]);

  const tipoCategoria = tipo === "pagar" ? "despesa" : "receita";
  const catsFiltradas = (cats ?? []).filter((c) => c.tipo === tipoCategoria);

  const mut = useMutation({
    mutationFn: async () => {
      const base = {
        tipo,
        descricao: descricao.trim(),
        valor: Number(valor.replace(",", ".")),
        vencimento,
        categoria_id: categoriaId,
        observacao: observacao.trim() || null,
      };
      if (inicial?.id) {
        await atualizarFn({ data: { id: inicial.id, ...base } });
      } else {
        await criarFn({
          data: {
            ...base,
            recorrencia,
            ocorrencias: recorrencia === "nenhuma" ? 1 : Math.max(1, Math.min(60, Number(ocorrencias) || 1)),
          },
        });
      }
    },
    onSuccess: () => {
      toast.success(inicial?.id ? "Conta atualizada" : "Conta registrada");
      qc.invalidateQueries({ queryKey: ["contas"] });
      qc.invalidateQueries({ queryKey: ["resumoContas"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error("Erro ao salvar", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">
            {inicial?.id ? "Editar conta" : `Nova conta a ${tipo}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
          <div className="flex gap-2">
            <Button type="button" variant={tipo === "pagar" ? "default" : "outline"} onClick={() => setTipo("pagar")} className="flex-1"
              style={tipo === "pagar" ? { backgroundColor: "var(--color-despesa)", color: "white" } : undefined}>
              ↓ A pagar
            </Button>
            <Button type="button" variant={tipo === "receber" ? "default" : "outline"} onClick={() => setTipo("receber")} className="flex-1"
              style={tipo === "receber" ? { backgroundColor: "var(--color-receita)", color: "white" } : undefined}>
              ↑ A receber
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input required maxLength={200} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input required inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Vencimento</Label>
              <Input type="date" required value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
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
          {!inicial?.id && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Recorrência</Label>
                <Select value={recorrencia} onValueChange={(v: any) => setRecorrencia(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhuma">Sem repetição</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {recorrencia !== "nenhuma" && (
                <div className="space-y-1.5">
                  <Label>Parcelas / repetições</Label>
                  <Input type="number" min={1} max={60} value={ocorrencias} onChange={(e) => setOcorrencias(e.target.value)} />
                </div>
              )}
            </div>
          )}
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
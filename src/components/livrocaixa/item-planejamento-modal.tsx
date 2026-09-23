import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { criarItemPlanejamento, editarItemPlanejamento } from "@/lib/planejamento.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export type ItemPlanejamentoEdit = {
  id?: string;
  nome: string;
  valor_planejado: number;
  cor: string;
};

const CORES = ["#B08D57", "#7C9B6B", "#6E93A0", "#C1595A", "#8FAE7C", "#C4975B"];

export function ItemPlanejamentoModal({
  open,
  onOpenChange,
  planejamentoId,
  inicial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  planejamentoId: string;
  inicial?: ItemPlanejamentoEdit;
}) {
  const qc = useQueryClient();
  const criarFn = useServerFn(criarItemPlanejamento);
  const editarFn = useServerFn(editarItemPlanejamento);

  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [cor, setCor] = useState(CORES[0]);

  useEffect(() => {
    if (!open) return;
    if (inicial) {
      setNome(inicial.nome);
      setValor(String(inicial.valor_planejado));
      setCor(inicial.cor);
    } else {
      setNome(""); setValor(""); setCor(CORES[0]);
    }
  }, [open, inicial]);

  const mut = useMutation({
    mutationFn: async () => {
      const payload = { nome: nome.trim(), valor_planejado: Number(valor.replace(",", ".")) || 0, cor };
      if (inicial?.id) await editarFn({ data: { id: inicial.id, ...payload } });
      else await criarFn({ data: { planejamento_id: planejamentoId, ...payload } });
    },
    onSuccess: () => {
      toast.success(inicial?.id ? "Categoria atualizada" : "Categoria adicionada");
      qc.invalidateQueries({ queryKey: ["planejamento"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  const valido = nome.trim().length > 0 && Number(valor.replace(",", ".")) >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{inicial?.id ? "Editar categoria" : "Nova categoria do planejamento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Alimentação, Lazer, Reserva..." maxLength={80} autoFocus />
          </div>
          <div>
            <Label>Valor planejado</Label>
            <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" />
          </div>
          <div>
            <Label>Cor</Label>
            <div className="flex gap-2 mt-1">
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className={`w-7 h-7 rounded-full ${cor === c ? "ring-2 ring-offset-2 ring-offset-background ring-foreground" : ""}`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => mut.mutate()} disabled={!valido || mut.isPending}>
              {mut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { criarMeta, editarMeta } from "@/lib/metas.functions";
import { listarCategorias } from "@/lib/livrocaixa.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export type MetaEdit = {
  id?: string;
  nome: string;
  tipo: "economia" | "gasto_maximo";
  categoria_id: string | null;
  valor_alvo: number;
  cor: string;
  icone: string;
  prazo: string | null;
};

const CORES = ["#B08D57", "#7C9B6B", "#6E93A0", "#C1595A", "#8FAE7C", "#C4975B"];

export function MetaModal({
  open,
  onOpenChange,
  inicial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  inicial?: MetaEdit;
}) {
  const qc = useQueryClient();
  const criarFn = useServerFn(criarMeta);
  const editarFn = useServerFn(editarMeta);
  const catFn = useServerFn(listarCategorias);
  const { data: cats } = useQuery({ queryKey: ["categorias"], queryFn: () => catFn() });
  const catsDespesa = (cats ?? []).filter((c: any) => c.tipo === "despesa");

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"economia" | "gasto_maximo">("economia");
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [valorAlvo, setValorAlvo] = useState("");
  const [cor, setCor] = useState(CORES[0]);
  const [prazo, setPrazo] = useState("");

  useEffect(() => {
    if (!open) return;
    if (inicial) {
      setNome(inicial.nome);
      setTipo(inicial.tipo);
      setCategoriaId(inicial.categoria_id);
      setValorAlvo(String(inicial.valor_alvo));
      setCor(inicial.cor);
      setPrazo(inicial.prazo ?? "");
    } else {
      setNome(""); setTipo("economia"); setCategoriaId(null);
      setValorAlvo(""); setCor(CORES[0]); setPrazo("");
    }
  }, [open, inicial]);

  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: nome.trim(),
        tipo,
        categoria_id: tipo === "gasto_maximo" ? categoriaId : null,
        valor_alvo: Number(valorAlvo.replace(",", ".")),
        cor,
        icone: "target",
        prazo: prazo || null,
      };
      if (inicial?.id) await editarFn({ data: { id: inicial.id, ...payload } });
      else await criarFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(inicial?.id ? "Meta atualizada" : "Meta criada");
      qc.invalidateQueries({ queryKey: ["metas"] });
      qc.invalidateQueries({ queryKey: ["resumoMetas"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  const valido = nome.trim() && Number(valorAlvo.replace(",", ".")) > 0 && (tipo === "economia" || categoriaId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{inicial?.id ? "Editar meta" : "Nova meta"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome da meta</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Viagem para o Chile, Reserva de emergência..." maxLength={120} />
          </div>
          <div>
            <Label>Tipo de meta</Label>
            <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="economia">Economizar até um valor (ex: viagem, reserva)</SelectItem>
                <SelectItem value="gasto_maximo">Limite de gasto por categoria no mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {tipo === "gasto_maximo" && (
            <div>
              <Label>Categoria</Label>
              <Select value={categoriaId ?? "none"} onValueChange={(v) => setCategoriaId(v === "none" ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione uma categoria</SelectItem>
                  {catsDespesa.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{tipo === "economia" ? "Valor alvo" : "Limite mensal"}</Label>
              <Input value={valorAlvo} onChange={(e) => setValorAlvo(e.target.value)} placeholder="0,00" inputMode="decimal" />
            </div>
            <div>
              <Label>Prazo (opcional)</Label>
              <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Cor</Label>
            <div className="flex gap-2 items-center flex-wrap mt-1">
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className={`w-7 h-7 rounded-full border-2 ${cor === c ? "border-foreground" : "border-transparent"}`}
                  style={{ background: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
              <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="w-9 h-7 rounded border ml-1" />
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

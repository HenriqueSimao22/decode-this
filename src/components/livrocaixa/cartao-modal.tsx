import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { criarCartao, editarCartao } from "@/lib/cartoes.functions";
import { BANCOS, BANDEIRAS, getBanco } from "@/lib/bancos";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export type CartaoEdit = {
  id?: string;
  nome: string;
  banco: string;
  bandeira: string;
  cor: string;
  limite: number | null;
  dia_fechamento: number;
  dia_vencimento: number;
};

export function CartaoModal({
  open,
  onOpenChange,
  inicial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  inicial?: CartaoEdit;
}) {
  const qc = useQueryClient();
  const criarFn = useServerFn(criarCartao);
  const editarFn = useServerFn(editarCartao);

  const [nome, setNome] = useState("");
  const [banco, setBanco] = useState("nubank");
  const [bandeira, setBandeira] = useState("mastercard");
  const [cor, setCor] = useState("#820ad1");
  const [limite, setLimite] = useState("");
  const [diaFec, setDiaFec] = useState("1");
  const [diaVen, setDiaVen] = useState("10");

  useEffect(() => {
    if (!open) return;
    if (inicial) {
      setNome(inicial.nome);
      setBanco(inicial.banco);
      setBandeira(inicial.bandeira);
      setCor(inicial.cor);
      setLimite(inicial.limite?.toString() ?? "");
      setDiaFec(String(inicial.dia_fechamento));
      setDiaVen(String(inicial.dia_vencimento));
    } else {
      setNome("");
      setBanco("nubank");
      setBandeira("mastercard");
      setCor("#820ad1");
      setLimite("");
      setDiaFec("1");
      setDiaVen("10");
    }
  }, [open, inicial]);

  // Ao trocar banco, sugere a cor padrão (se ainda não editada manualmente)
  const onBancoChange = (b: string) => {
    setBanco(b);
    const info = getBanco(b);
    setCor(info.cor);
  };

  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: nome.trim(),
        banco,
        bandeira,
        cor,
        limite: limite ? Number(limite.replace(",", ".")) : null,
        dia_fechamento: Number(diaFec),
        dia_vencimento: Number(diaVen),
      };
      if (inicial?.id) await editarFn({ data: { id: inicial.id, ...payload } });
      else await criarFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(inicial?.id ? "Cartão atualizado" : "Cartão criado");
      qc.invalidateQueries({ queryKey: ["cartoes"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {inicial?.id ? "Editar cartão" : "Novo cartão"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Apelido</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Nubank Roxinho" maxLength={80} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Banco</Label>
              <Select value={banco} onValueChange={onBancoChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {BANCOS.map((b) => (
                    <SelectItem key={b.codigo} value={b.codigo}>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 rounded" style={{ background: b.cor }} />
                        {b.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bandeira</Label>
              <Select value={bandeira} onValueChange={setBandeira}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BANDEIRAS.map((b) => (
                    <SelectItem key={b.codigo} value={b.codigo}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dia de fechamento</Label>
              <Input type="number" min={1} max={31} value={diaFec} onChange={(e) => setDiaFec(e.target.value)} />
            </div>
            <div>
              <Label>Dia de vencimento</Label>
              <Input type="number" min={1} max={31} value={diaVen} onChange={(e) => setDiaVen(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Limite (opcional)</Label>
              <Input value={limite} onChange={(e) => setLimite(e.target.value)} placeholder="0,00" inputMode="decimal" />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex gap-2 items-center h-9">
                <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="w-10 h-9 rounded border" />
                <span className="text-xs text-muted-foreground font-mono">{cor}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => mut.mutate()} disabled={!nome.trim() || mut.isPending}>
              {mut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { criarInvestimento, editarInvestimento } from "@/lib/investimentos.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export type InvestimentoEdit = {
  id?: string;
  tipo: "acao" | "fii" | "renda_fixa" | "cripto" | "fundo" | "outro";
  nome: string;
  ticker: string | null;
  quantidade: number;
  preco_medio: number;
  valor_atual_unitario: number | null;
  cor: string;
  observacao: string | null;
};

export const TIPOS_INVESTIMENTO: { valor: InvestimentoEdit["tipo"]; label: string; cor: string }[] = [
  { valor: "acao", label: "Ação", cor: "#7C9B6B" },
  { valor: "fii", label: "Fundo imobiliário (FII)", cor: "#C4975B" },
  { valor: "renda_fixa", label: "Renda fixa", cor: "#6E93A0" },
  { valor: "cripto", label: "Criptomoeda", cor: "#C1595A" },
  { valor: "fundo", label: "Fundo de investimento", cor: "#B08D57" },
  { valor: "outro", label: "Outro", cor: "#8D6E63" },
];

export function InvestimentoModal({
  open,
  onOpenChange,
  inicial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  inicial?: InvestimentoEdit;
}) {
  const qc = useQueryClient();
  const criarFn = useServerFn(criarInvestimento);
  const editarFn = useServerFn(editarInvestimento);

  const [tipo, setTipo] = useState<InvestimentoEdit["tipo"]>("acao");
  const [nome, setNome] = useState("");
  const [ticker, setTicker] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [precoMedio, setPrecoMedio] = useState("");
  const [valorAtual, setValorAtual] = useState("");
  const [obs, setObs] = useState("");

  useEffect(() => {
    if (!open) return;
    if (inicial) {
      setTipo(inicial.tipo);
      setNome(inicial.nome);
      setTicker(inicial.ticker ?? "");
      setQuantidade(String(inicial.quantidade));
      setPrecoMedio(String(inicial.preco_medio));
      setValorAtual(inicial.valor_atual_unitario != null ? String(inicial.valor_atual_unitario) : "");
      setObs(inicial.observacao ?? "");
    } else {
      setTipo("acao"); setNome(""); setTicker(""); setQuantidade(""); setPrecoMedio(""); setValorAtual(""); setObs("");
    }
  }, [open, inicial]);

  const mut = useMutation({
    mutationFn: async () => {
      const infoTipo = TIPOS_INVESTIMENTO.find((t) => t.valor === tipo)!;
      const payload = {
        tipo,
        nome: nome.trim(),
        ticker: ticker.trim() || null,
        quantidade: Number(quantidade.replace(",", ".")) || 0,
        preco_medio: Number(precoMedio.replace(",", ".")) || 0,
        valor_atual_unitario: valorAtual ? Number(valorAtual.replace(",", ".")) : null,
        cor: infoTipo.cor,
        observacao: obs.trim() || null,
      };
      if (inicial?.id) await editarFn({ data: { id: inicial.id, ...payload } });
      else await criarFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(inicial?.id ? "Investimento atualizado" : "Investimento adicionado");
      qc.invalidateQueries({ queryKey: ["investimentos"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  const valido = nome.trim() && Number(quantidade.replace(",", ".")) >= 0 && Number(precoMedio.replace(",", ".")) >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{inicial?.id ? "Editar investimento" : "Novo investimento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS_INVESTIMENTO.map((t) => (
                  <SelectItem key={t.valor} value={t.valor}>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: t.cor }} />
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Bitcoin, HGLG11..." maxLength={120} />
            </div>
            <div>
              <Label>Ticker (opcional)</Label>
              <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="Ex: BTC, HGLG11" maxLength={20} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantidade</Label>
              <Input value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="0" inputMode="decimal" />
            </div>
            <div>
              <Label>Preço médio (por unidade)</Label>
              <Input value={precoMedio} onChange={(e) => setPrecoMedio(e.target.value)} placeholder="0,00" inputMode="decimal" />
            </div>
          </div>
          <div>
            <Label>Valor atual por unidade (opcional)</Label>
            <Input value={valorAtual} onChange={(e) => setValorAtual(e.target.value)} placeholder="Deixe em branco para usar o preço médio" inputMode="decimal" />
            <p className="text-xs text-muted-foreground mt-1">
              Por enquanto isso é preenchido manualmente. No futuro dá pra automatizar a cotação.
            </p>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} maxLength={500} rows={2} />
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

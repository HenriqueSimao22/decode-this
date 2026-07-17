import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listarCartoes } from "@/lib/cartoes.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CartaoModal } from "@/components/livrocaixa/cartao-modal";
import { getBanco, BANDEIRAS } from "@/lib/bancos";
import { formatBRL } from "@/components/livrocaixa/transacao-modal";
import { Plus, CreditCard } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cartoes")({
  head: () => ({ meta: [{ title: "Cartões — Livro Caixa" }] }),
  component: CartoesPage,
});

function CartoesPage() {
  const listarFn = useServerFn(listarCartoes);
  const { data: cartoes } = useQuery({ queryKey: ["cartoes"], queryFn: () => listarFn() });
  const [modal, setModal] = useState(false);

  const bandeiraNome = (c: string) => BANDEIRAS.find((b) => b.codigo === c)?.nome ?? c;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Cartões de crédito</h1>
          <p className="text-sm text-muted-foreground">Controle faturas, parcelas e limites</p>
        </div>
        <Button onClick={() => setModal(true)}>
          <Plus className="w-4 h-4 mr-1" /> Novo cartão
        </Button>
      </header>

      {(cartoes ?? []).length === 0 && (
        <Card className="p-10 text-center">
          <CreditCard className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado ainda.</p>
          <Button className="mt-4" onClick={() => setModal(true)}>Cadastrar meu primeiro cartão</Button>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(cartoes ?? []).map((c: any) => {
          const banco = getBanco(c.banco);
          const usoPct = c.limite ? Math.min(100, (Number(c.total_em_aberto) / Number(c.limite)) * 100) : null;
          return (
            <Link key={c.id} to="/cartoes/$id" params={{ id: c.id }} className="block">
              <Card
                className="p-5 relative overflow-hidden text-white hover:brightness-110 transition-all cursor-pointer min-h-40"
                style={{ background: `linear-gradient(135deg, ${c.cor} 0%, ${c.cor}cc 100%)` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide opacity-80">{banco.nome}</p>
                    <p className="font-serif text-lg font-semibold">{c.nome}</p>
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">{bandeiraNome(c.bandeira)}</Badge>
                </div>
                <div className="mt-6">
                  <p className="text-[10px] uppercase opacity-70">Fatura em aberto</p>
                  <p className={`font-mono text-2xl font-bold ${c.bloqueado ? "text-red-200" : ""}`}>
                    {c.bloqueado ? "− " : ""}{formatBRL(Number(c.total_em_aberto))}
                  </p>
                </div>
                {c.limite ? (
                  <div className="mt-3">
                    <div className="h-1.5 bg-white/20 rounded overflow-hidden">
                      <div className={`h-full ${c.bloqueado ? "bg-red-300" : "bg-white/80"}`} style={{ width: `${usoPct}%` }} />
                    </div>
                    <p className="text-[10px] opacity-70 mt-1">
                      {formatBRL(Number(c.total_em_aberto))} de {formatBRL(Number(c.limite))}
                    </p>
                  </div>
                ) : null}
                <p className="text-[10px] opacity-70 mt-2">
                  Fecha dia {c.dia_fechamento} · vence dia {c.dia_vencimento}
                </p>
                <div className="absolute top-2 right-2 flex gap-1">
                  {c.bloqueado && <Badge variant="destructive" className="border-0">Bloqueado</Badge>}
                  {!c.ativo && <Badge variant="secondary" className="bg-black/40 text-white border-0">Arquivado</Badge>}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <CartaoModal open={modal} onOpenChange={setModal} />
    </div>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listarCartoes } from "@/lib/cartoes.functions";
import { CartaoModal } from "@/components/livrocaixa/cartao-modal";
import { CartaoDetalhe, ULTIMO_CARTAO_KEY } from "@/components/livrocaixa/cartao-detalhe";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cartoes")({
  head: () => ({ meta: [{ title: "Cartões — Livro Caixa" }] }),
  component: CartoesIndex,
});

// Entra direto no extrato do último cartão usado (guardado no navegador),
// ou o mais recente cadastrado — sem redirecionar de rota, pra nunca ficar
// dependendo de uma navegação client-side que pode falhar/travar.
function CartoesIndex() {
  const listarFn = useServerFn(listarCartoes);
  const { data: cartoes, isLoading, isError, refetch } = useQuery({
    queryKey: ["cartoes"],
    queryFn: () => listarFn(),
    retry: 1,
  });
  const [modal, setModal] = useState(false);

  if (isError) {
    return (
      <div className="p-10 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Não foi possível carregar seus cartões agora.</p>
        <Button variant="outline" onClick={() => refetch()}>Tentar de novo</Button>
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando cartões...</p>;
  }

  if (!cartoes || cartoes.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="font-serif text-3xl font-semibold">Cartões de crédito</h1>
          <p className="text-sm text-muted-foreground">Controle faturas, parcelas e limites</p>
        </header>
        <Card className="p-10 text-center">
          <CreditCard className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado ainda.</p>
          <Button className="mt-4" onClick={() => setModal(true)}>Cadastrar meu primeiro cartão</Button>
        </Card>
        <CartaoModal open={modal} onOpenChange={setModal} />
      </div>
    );
  }

  const ultimoId = typeof window !== "undefined" ? localStorage.getItem(ULTIMO_CARTAO_KEY) : null;
  const alvo = cartoes.find((c: any) => c.id === ultimoId) ?? cartoes[cartoes.length - 1];

  return <CartaoDetalhe id={alvo.id} />;
}

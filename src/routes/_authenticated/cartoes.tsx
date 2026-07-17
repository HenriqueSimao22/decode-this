import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { listarCartoes } from "@/lib/cartoes.functions";
import { CartaoModal } from "@/components/livrocaixa/cartao-modal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus } from "lucide-react";

export const ULTIMO_CARTAO_KEY = "livrocaixa:ultimoCartaoId";

export const Route = createFileRoute("/_authenticated/cartoes")({
  head: () => ({ meta: [{ title: "Cartões — Livro Caixa" }] }),
  component: CartoesIndex,
});

// Ao entrar em /cartoes, vamos direto pro extrato do último cartão usado
// (ou o mais recente, se nunca abriu nenhum). A grade com todos fica em /cartoes/todos.
function CartoesIndex() {
  const navigate = useNavigate();
  const listarFn = useServerFn(listarCartoes);
  const { data: cartoes, isLoading } = useQuery({ queryKey: ["cartoes"], queryFn: () => listarFn() });
  const [modal, setModal] = useState(false);

  useEffect(() => {
    if (!cartoes || cartoes.length === 0) return;
    const ultimoId = typeof window !== "undefined" ? localStorage.getItem(ULTIMO_CARTAO_KEY) : null;
    const alvo = cartoes.find((c: any) => c.id === ultimoId) ?? cartoes[cartoes.length - 1];
    navigate({ to: "/cartoes/$id", params: { id: alvo.id }, replace: true });
  }, [cartoes, navigate]);

  if (isLoading || (cartoes && cartoes.length > 0)) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Carregando cartões...</div>;
  }

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

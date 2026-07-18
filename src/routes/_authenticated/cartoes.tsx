import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { listarCartoes } from "@/lib/cartoes.functions";
import { CartaoModal } from "@/components/livrocaixa/cartao-modal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

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
  const { data: cartoes, isLoading, isError, refetch } = useQuery({
    queryKey: ["cartoes"],
    queryFn: () => listarFn(),
    retry: 1,
  });
  const [modal, setModal] = useState(false);
  const [redirecionando, setRedirecionando] = useState(false);

  useEffect(() => {
    if (!cartoes || cartoes.length === 0) return;
    try {
      const ultimoId = typeof window !== "undefined" ? localStorage.getItem(ULTIMO_CARTAO_KEY) : null;
      const alvo = cartoes.find((c: any) => c.id === ultimoId) ?? cartoes[cartoes.length - 1];
      setRedirecionando(true);
      navigate({ to: "/cartoes/$id", params: { id: alvo.id }, replace: true });
    } catch {
      setRedirecionando(false);
    }
  }, [cartoes, navigate]);

  if (isError) {
    return (
      <div className="p-10 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Não foi possível carregar seus cartões agora.</p>
        <Button variant="outline" onClick={() => refetch()}>Tentar de novo</Button>
      </div>
    );
  }

  // Mesmo enquanto redireciona, deixamos um link manual visível — nunca uma tela
  // sem nenhuma ação possível caso o redirecionamento automático falhe.
  if (isLoading || redirecionando) {
    return (
      <div className="p-10 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Carregando cartões...</p>
        {cartoes && cartoes.length > 0 && (
          <Link to="/cartoes/$id" params={{ id: cartoes[cartoes.length - 1].id }} className="text-sm underline underline-offset-4">
            Clique aqui se a página não avançar sozinha
          </Link>
        )}
      </div>
    );
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

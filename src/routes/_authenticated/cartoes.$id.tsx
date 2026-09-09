import { createFileRoute } from "@tanstack/react-router";
import { CartaoDetalhe } from "@/components/livrocaixa/cartao-detalhe";

export const Route = createFileRoute("/_authenticated/cartoes/$id")({
  head: () => ({ meta: [{ title: "Cartão — Livro Caixa" }] }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return <CartaoDetalhe id={id} />;
}

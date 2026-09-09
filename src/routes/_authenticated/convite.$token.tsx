import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { verConvite, aceitarConvite } from "@/lib/workspaces.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/convite/$token")({
  component: ConvitePage,
});

function ConvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const verFn = useServerFn(verConvite);
  const aceitarFn = useServerFn(aceitarConvite);
  const { data: inv, error } = useQuery({
    queryKey: ["convite", token],
    queryFn: () => verFn({ data: { token } }),
    retry: false,
  });
  const aceitar = useMutation({
    mutationFn: () => aceitarFn({ data: { token } }),
    onSuccess: () => {
      toast.success("Você entrou no workspace!");
      qc.invalidateQueries();
      navigate({ to: "/" });
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  return (
    <div className="max-w-lg mx-auto py-12">
      <Card className="p-6 space-y-4">
        <h1 className="font-serif text-2xl font-semibold">Convite para workspace</h1>
        {error && (
          <p className="text-sm text-destructive">Não foi possível carregar este convite.</p>
        )}
        {inv && (
          <>
            <p className="text-sm">
              Você foi convidado para participar do workspace{" "}
              <strong className="font-serif">{(inv as any).workspaces?.nome}</strong>.
            </p>
            <p className="text-xs text-muted-foreground">
              Enviado para <strong>{inv.email_convidado}</strong> · status: {inv.status}
            </p>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => aceitar.mutate()} disabled={inv.status !== "pendente" || aceitar.isPending}>
                {aceitar.isPending ? "Aceitando..." : "Aceitar convite"}
              </Button>
              <Button variant="outline" onClick={() => navigate({ to: "/" })}>
                Cancelar
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
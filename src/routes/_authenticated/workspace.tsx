import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listarWorkspaces,
  criarWorkspaceConjunto,
  renomearWorkspace,
  listarMembros,
  atualizarCorMembro,
  removerMembro,
  gerarConvite,
  listarConvites,
  revogarConvite,
} from "@/lib/workspaces.functions";
import { getPerfil } from "@/lib/livrocaixa.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Copy, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workspace")({
  component: WorkspacePage,
});

const CORES = ["#6366f1", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#8b5cf6", "#ec4899", "#78716c"];

function WorkspacePage() {
  const qc = useQueryClient();
  const wsFn = useServerFn(listarWorkspaces);
  const perfilFn = useServerFn(getPerfil);
  const criarFn = useServerFn(criarWorkspaceConjunto);
  const renFn = useServerFn(renomearWorkspace);
  const membrosFn = useServerFn(listarMembros);
  const corFn = useServerFn(atualizarCorMembro);
  const rmFn = useServerFn(removerMembro);
  const conviteFn = useServerFn(gerarConvite);
  const convitesFn = useServerFn(listarConvites);
  const revFn = useServerFn(revogarConvite);

  const { data: perfil } = useQuery({ queryKey: ["perfil"], queryFn: () => perfilFn() });
  const { data: workspaces } = useQuery({ queryKey: ["workspaces"], queryFn: () => wsFn() });
  const atual = (workspaces ?? []).find((w) => w.id === perfil?.workspace_ativo);

  const { data: membros } = useQuery({
    queryKey: ["membros", atual?.id],
    queryFn: () => membrosFn({ data: { workspace_id: atual!.id } }),
    enabled: !!atual?.id,
  });
  const { data: convites } = useQuery({
    queryKey: ["convites", atual?.id],
    queryFn: () => convitesFn({ data: { workspace_id: atual!.id } }),
    enabled: !!atual?.id && atual?.papel === "dono",
  });

  const [nomeNovo, setNomeNovo] = useState("");
  const [nomeEditar, setNomeEditar] = useState("");
  const [emailConvite, setEmailConvite] = useState("");

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["workspaces"] });
    qc.invalidateQueries({ queryKey: ["membros"] });
    qc.invalidateQueries({ queryKey: ["convites"] });
  };

  const criar = useMutation({
    mutationFn: () => criarFn({ data: { nome: nomeNovo.trim() } }),
    onSuccess: () => {
      toast.success("Workspace criado");
      setNomeNovo("");
      invalidar();
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });
  const renomear = useMutation({
    mutationFn: () => renFn({ data: { id: atual!.id, nome: nomeEditar.trim() } }),
    onSuccess: () => { toast.success("Renomeado"); setNomeEditar(""); invalidar(); },
  });
  const corMut = useMutation({
    mutationFn: (v: { user_id: string; cor: string }) =>
      corFn({ data: { workspace_id: atual!.id, ...v } }),
    onSuccess: () => invalidar(),
  });
  const remover = useMutation({
    mutationFn: (user_id: string) => rmFn({ data: { workspace_id: atual!.id, user_id } }),
    onSuccess: () => { toast.success("Removido"); invalidar(); },
  });
  const convidar = useMutation({
    mutationFn: () => conviteFn({ data: { workspace_id: atual!.id, email: emailConvite.trim() } }),
    onSuccess: async (row: any) => {
      const url = `${window.location.origin}/convite/${row.token}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Convite criado", { description: "Link copiado para a área de transferência" });
      setEmailConvite("");
      invalidar();
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });
  const revogar = useMutation({
    mutationFn: (id: string) => revFn({ data: { id } }),
    onSuccess: () => { toast.success("Revogado"); invalidar(); },
  });

  const isDono = atual?.papel === "dono";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold">Workspace</h1>
        <p className="text-sm text-muted-foreground">Gerencie contas individuais e conjuntas</p>
      </header>

      {atual && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Workspace ativo</p>
              <div className="flex items-center gap-2 mt-1">
                <h2 className="font-serif text-xl font-semibold">{atual.nome}</h2>
                <Badge variant="outline">{atual.tipo === "conjunta" ? "Conjunta" : "Individual"}</Badge>
                <Badge variant="secondary">{atual.papel}</Badge>
              </div>
            </div>
          </div>
          {isDono && (
            <div className="flex gap-2">
              <Input
                placeholder="Renomear..."
                value={nomeEditar}
                onChange={(e) => setNomeEditar(e.target.value)}
                maxLength={80}
              />
              <Button onClick={() => renomear.mutate()} disabled={!nomeEditar.trim()}>
                Salvar
              </Button>
            </div>
          )}
        </Card>
      )}

      {atual && (
        <Card className="p-5 space-y-4">
          <h3 className="font-serif text-lg font-semibold">Membros</h3>
          <div className="space-y-2">
            {(membros ?? []).map((m) => (
              <div key={m.user_id} className="flex items-center gap-3 p-3 border rounded-md">
                <Avatar className="w-8 h-8">
                  {(m as any).avatar_url ? <AvatarImage src={(m as any).avatar_url} alt={m.nome} /> : null}
                  <AvatarFallback className="text-xs font-bold text-white" style={{ background: m.cor }}>
                    {(m.nome ?? "?").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.nome}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.email} · {m.papel}</div>
                </div>
                <div className="flex gap-1">
                  {CORES.map((c) => (
                    <button
                      key={c}
                      onClick={() => corMut.mutate({ user_id: m.user_id, cor: c })}
                      className={`w-5 h-5 rounded-full border-2 ${m.cor === c ? "border-foreground" : "border-transparent"}`}
                      style={{ background: c }}
                      aria-label={`Cor ${c}`}
                    />
                  ))}
                </div>
                {isDono && m.papel !== "dono" && (
                  <button
                    onClick={() => confirm(`Remover ${m.nome}?`) && remover.mutate(m.user_id)}
                    className="p-2 hover:bg-destructive/10 text-destructive rounded"
                    aria-label="Remover"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {atual?.tipo === "conjunta" && isDono && (
        <Card className="p-5 space-y-4">
          <h3 className="font-serif text-lg font-semibold">Convidar por e-mail</h3>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="parceiro@email.com"
              value={emailConvite}
              onChange={(e) => setEmailConvite(e.target.value)}
            />
            <Button onClick={() => convidar.mutate()} disabled={!emailConvite.trim() || convidar.isPending}>
              Gerar link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Ao gerar, o link é copiado. Envie para o convidado — ele precisa entrar com o mesmo e-mail para aceitar.
          </p>
          {(convites ?? []).length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Convites</p>
              {(convites ?? []).map((c) => {
                const url = `${window.location.origin}/convite/${c.token}`;
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 border rounded-md text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{c.email_convidado}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.status} · expira {new Date(c.expira_em).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    {c.status === "pendente" && (
                      <>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(url);
                            toast.success("Link copiado");
                          }}
                          className="p-2 hover:bg-accent rounded"
                          aria-label="Copiar link"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => revogar.mutate(c.id)}
                          className="p-2 hover:bg-destructive/10 text-destructive rounded"
                          aria-label="Revogar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <Card className="p-5 space-y-3">
        <h3 className="font-serif text-lg font-semibold">Criar workspace conjunto</h3>
        <p className="text-sm text-muted-foreground">Novo workspace para compartilhar com outra pessoa (ex: cônjuge).</p>
        <div className="flex gap-2">
          <Input
            placeholder="Ex: Casa - Henrique & Ana"
            value={nomeNovo}
            onChange={(e) => setNomeNovo(e.target.value)}
            maxLength={80}
          />
          <Button onClick={() => criar.mutate()} disabled={!nomeNovo.trim() || criar.isPending}>
            Criar
          </Button>
        </div>
      </Card>
    </div>
  );
}
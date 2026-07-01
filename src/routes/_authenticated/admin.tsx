import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listarCodigos,
  gerarCodigos,
  revogarCodigo,
  listarUsuarios,
  definirBloqueio,
  definirAdmin,
  souAdmin,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Ban, ShieldCheck, ShieldOff, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administração — Livro Caixa" }] }),
  component: AdminPage,
});

function AdminPage() {
  const souAdminFn = useServerFn(souAdmin);
  const { data: perm, isLoading } = useQuery({ queryKey: ["souAdmin"], queryFn: () => souAdminFn() });
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!perm?.admin) {
    return (
      <div className="max-w-md">
        <h1 className="font-serif text-2xl mb-2">Acesso restrito</h1>
        <p className="text-muted-foreground">Somente administradores acessam esta área.</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl">Administração</h1>
        <p className="text-sm text-muted-foreground">Controle de acesso e usuários da plataforma.</p>
      </header>
      <Tabs defaultValue="codigos">
        <TabsList>
          <TabsTrigger value="codigos">Códigos de acesso</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
        </TabsList>
        <TabsContent value="codigos" className="mt-4"><CodigosPanel /></TabsContent>
        <TabsContent value="usuarios" className="mt-4"><UsuariosPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function CodigosPanel() {
  const qc = useQueryClient();
  const listar = useServerFn(listarCodigos);
  const gerar = useServerFn(gerarCodigos);
  const revogar = useServerFn(revogarCodigo);
  const { data: codigos } = useQuery({ queryKey: ["codigos"], queryFn: () => listar() });
  const [qtd, setQtd] = useState(1);
  const [prefixo, setPrefixo] = useState("LIVRO");
  const [notas, setNotas] = useState("");

  const mGerar = useMutation({
    mutationFn: (v: { quantidade: number; prefixo: string; notas?: string }) => gerar({ data: v }),
    onSuccess: (rows) => {
      qc.invalidateQueries({ queryKey: ["codigos"] });
      toast.success(`${rows.length} código(s) gerado(s)`);
      setNotas("");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const mRev = useMutation({
    mutationFn: (id: string) => revogar({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["codigos"] }); toast.success("Código revogado"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="font-serif text-lg">Gerar novos códigos</CardTitle></CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              mGerar.mutate({ quantidade: qtd, prefixo, notas: notas || undefined });
            }}
          >
            <div><Label>Quantidade</Label><Input type="number" min={1} max={100} value={qtd} onChange={(e) => setQtd(Number(e.target.value))} /></div>
            <div><Label>Prefixo</Label><Input value={prefixo} onChange={(e) => setPrefixo(e.target.value.toUpperCase())} maxLength={10} /></div>
            <div className="md:col-span-2"><Label>Notas (opcional)</Label><Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ex.: Cliente João — pago R$ 50" /></div>
            <div className="md:col-span-4"><Button type="submit" disabled={mGerar.isPending}>{mGerar.isPending ? "Gerando…" : "Gerar códigos"}</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-serif text-lg">Códigos ({codigos?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Código</TableHead><TableHead>Status</TableHead><TableHead>Notas</TableHead>
              <TableHead>Usado em</TableHead><TableHead className="text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(codigos ?? []).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono">{c.code}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="max-w-[240px] truncate">{c.notas ?? "—"}</TableCell>
                  <TableCell>{c.usado_em ? new Date(c.usado_em).toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copiado"); }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    {c.status === "ativo" && (
                      <Button size="sm" variant="ghost" onClick={() => mRev.mutate(c.id)}>
                        <Ban className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {codigos?.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhum código gerado ainda.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { ativo: "bg-emerald-100 text-emerald-800", usado: "bg-slate-100 text-slate-700", revogado: "bg-red-100 text-red-800" };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? ""}`}>{status}</span>;
}

function UsuariosPanel() {
  const qc = useQueryClient();
  const listar = useServerFn(listarUsuarios);
  const bloq = useServerFn(definirBloqueio);
  const adm = useServerFn(definirAdmin);
  const { data: usuarios } = useQuery({ queryKey: ["usuarios"], queryFn: () => listar() });

  const mBloq = useMutation({
    mutationFn: (v: { userId: string; bloqueado: boolean }) => bloq({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["usuarios"] }); toast.success("Atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });
  const mAdm = useMutation({
    mutationFn: (v: { userId: string; admin: boolean }) => adm({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["usuarios"] }); toast.success("Atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="font-serif text-lg">Usuários ({usuarios?.length ?? 0})</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Código</TableHead>
            <TableHead>Status</TableHead><TableHead>Papel</TableHead><TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(usuarios ?? []).map((u: any) => {
              const isAdmin = u.roles?.includes("admin");
              return (
                <TableRow key={u.id}>
                  <TableCell>{u.nome ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{u.codigo_usado ?? "—"}</TableCell>
                  <TableCell>{u.bloqueado ? <Badge variant="destructive">Bloqueado</Badge> : <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Ativo</Badge>}</TableCell>
                  <TableCell>{isAdmin ? <Badge>Admin</Badge> : <Badge variant="secondary">Usuário</Badge>}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" title={u.bloqueado ? "Desbloquear" : "Bloquear"}
                      onClick={() => mBloq.mutate({ userId: u.id, bloqueado: !u.bloqueado })}>
                      {u.bloqueado ? <Check className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" title={isAdmin ? "Remover admin" : "Tornar admin"}
                      onClick={() => mAdm.mutate({ userId: u.id, admin: !isAdmin })}>
                      {isAdmin ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
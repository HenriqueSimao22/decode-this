import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getPerfil,
  atualizarPerfil,
  importarBackup,
  exportarBackup,
} from "@/lib/livrocaixa.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfigPage,
});

function ConfigPage() {
  const qc = useQueryClient();
  const perfilFn = useServerFn(getPerfil);
  const atualizarFn = useServerFn(atualizarPerfil);
  const importarFn = useServerFn(importarBackup);
  const exportarFn = useServerFn(exportarBackup);

  const { data: perfil } = useQuery({ queryKey: ["perfil"], queryFn: () => perfilFn() });
  const [nome, setNome] = useState("");
  useEffect(() => { if (perfil?.nome) setNome(perfil.nome); }, [perfil?.nome]);

  const fileRef = useRef<HTMLInputElement>(null);

  const salvarPerfil = useMutation({
    mutationFn: (n: string) => atualizarFn({ data: { nome: n } }),
    onSuccess: () => { toast.success("Perfil atualizado"); qc.invalidateQueries({ queryKey: ["perfil"] }); },
  });

  const salvarTema = useMutation({
    mutationFn: (t: "claro" | "pergaminho" | "escuro") => atualizarFn({ data: { tema: t } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["perfil"] }),
  });

  const importar = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      let json: any;
      try { json = JSON.parse(text); } catch { throw new Error("Arquivo inválido"); }
      // O app antigo salva no localStorage como { transacoes: [...], categorias: [...] } (ou variações)
      const payload = {
        transacoes: (json.transacoes || json.transactions || []).map((t: any) => ({
          tipo: t.tipo || t.type,
          descricao: t.descricao || t.description || "",
          valor: Number(t.valor ?? t.value ?? 0),
          data: (t.data || t.date || "").slice(0, 10),
          categoria: t.categoria || t.category || null,
          observacao: t.observacao || t.notes || null,
        })).filter((t: any) => t.tipo && t.descricao && t.data),
        categorias: (json.categorias || json.categories || []).map((c: any) => ({
          nome: c.nome || c.name,
          tipo: c.tipo || c.type,
          cor: c.cor || c.color || null,
        })).filter((c: any) => c.nome && c.tipo),
      };
      return importarFn({ data: payload });
    },
    onSuccess: (res) => {
      toast.success("Backup importado", {
        description: `${res.transacoesImportadas} transações e ${res.categoriasCriadas} novas categorias.`,
      });
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error("Falha ao importar", { description: e.message }),
  });

  async function exportar() {
    const data = await exportarFn();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `livro-caixa-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exportado");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="font-serif text-3xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Personalize sua conta e gerencie seus dados</p>
      </header>

      <Card className="p-6 space-y-4">
        <h2 className="font-serif text-xl font-semibold">Perfil</h2>
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={100} />
        </div>
        <Button onClick={() => salvarPerfil.mutate(nome.trim())} disabled={salvarPerfil.isPending || !nome.trim()}>
          Salvar
        </Button>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-serif text-xl font-semibold">Tema</h2>
        <p className="text-sm text-muted-foreground">O sidebar acompanha o tema escolhido.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <TemaCard
            ativo={perfil?.tema === "claro"}
            onClick={() => salvarTema.mutate("claro")}
            nome="Claro"
            desc="Branco limpo com acento dourado"
            paleta={["#ffffff", "#f5f4ef", "#c9a84c", "#1f1a13"]}
          />
          <TemaCard
            ativo={perfil?.tema === "pergaminho"}
            onClick={() => salvarTema.mutate("pergaminho")}
            nome="Pergaminho"
            desc="Papel bege retrô, vibe livro-caixa"
            paleta={["#faf6ec", "#efe6d0", "#7a5a2e", "#2a231a"]}
          />
          <TemaCard
            ativo={perfil?.tema === "escuro"}
            onClick={() => salvarTema.mutate("escuro")}
            nome="Obsidian Gold"
            desc="Preto profundo com dourado quente"
            paleta={["#0a0a0a", "#171512", "#c9a84c", "#f0d78c"]}
          />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-serif text-xl font-semibold">Backup</h2>
        <p className="text-sm text-muted-foreground">
          Importe o JSON exportado pelo app antigo ou baixe um backup dos seus dados atuais.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importar.mutate(f);
              e.target.value = "";
            }}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={importar.isPending}>
            {importar.isPending ? "Importando..." : "⬆️ Importar backup"}
          </Button>
          <Button variant="outline" onClick={exportar}>⬇️ Exportar backup</Button>
        </div>
      </Card>
    </div>
  );
}

function TemaCard({
  ativo, onClick, nome, desc, paleta,
}: {
  ativo: boolean;
  onClick: () => void;
  nome: string;
  desc: string;
  paleta: [string, string, string, string];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded-lg border-2 transition-all ${
        ativo ? "border-primary shadow-sm" : "border-border hover:border-primary/40"
      }`}
    >
      <div className="flex gap-1 mb-3 h-8 rounded overflow-hidden">
        {paleta.map((c) => (
          <div key={c} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      <div className="font-serif text-lg font-semibold">{nome}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
    </button>
  );
}
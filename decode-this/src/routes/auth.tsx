import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Livro Caixa" },
      { name: "description", content: "Acesse sua conta do Livro Caixa ou cadastre-se para começar seu controle financeiro." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) return toast.error("Não conseguimos entrar", { description: error.message });
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/" });
  }

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    if (!aceitouTermos) {
      return toast.error("Você precisa aceitar os Termos de Uso e a Política de Privacidade.");
    }
    if (!codigo.trim()) {
      return toast.error("Informe seu código de acesso.", {
        description: "O cadastro é fechado — solicite um código ao administrador.",
      });
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome, codigo_acesso: codigo.trim().toUpperCase() },
      },
    });
    setLoading(false);
    if (error) {
      const msg = error.message.includes("Código")
        ? error.message
        : /invalid|inválido|expirad/i.test(error.message)
          ? "Código de acesso inválido ou expirado."
          : error.message;
      return toast.error("Não conseguimos cadastrar", { description: msg });
    }
    toast.success("Conta criada!", { description: "Verifique seu e-mail para confirmar o cadastro." });
  }

  async function google() {
    if (!codigo.trim()) {
      return toast.error("Informe seu código de acesso antes de continuar com o Google.", {
        description: "Novos cadastros exigem código. Já tem conta? O código é ignorado no login.",
      });
    }
    if (!aceitouTermos) {
      return toast.error("Você precisa aceitar os Termos de Uso e a Política de Privacidade.");
    }
    // Guarda o código para o primeiro cadastro Google (não afeta contas já existentes)
    try {
      sessionStorage.setItem("codigo_acesso_pendente", codigo.trim().toUpperCase());
    } catch {}
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) toast.error("Erro no login com Google", { description: String(res.error) });
  }

  async function recuperar() {
    if (!email) return toast.error("Informe seu e-mail primeiro.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth",
    });
    if (error) toast.error(error.message);
    else toast.success("Enviamos um e-mail para redefinir sua senha.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-4xl font-serif font-semibold text-foreground">Livro Caixa</h1>
            <p className="text-sm text-muted-foreground mt-1">Controle financeiro inteligente</p>
          </Link>
        </div>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-serif">Acesse sua conta</CardTitle>
            <CardDescription>Entre ou crie uma conta para começar</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="cadastro">Cadastrar</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="mt-4">
                <form onSubmit={login} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="senha">Senha</Label>
                    <Input id="senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Entrando..." : "Entrar"}
                  </Button>
                  <button type="button" onClick={recuperar} className="text-xs text-muted-foreground hover:text-foreground underline">
                    Esqueci minha senha
                  </button>
                </form>
              </TabsContent>
              <TabsContent value="cadastro" className="mt-4">
                <form onSubmit={cadastrar} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nome">Nome</Label>
                    <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email2">E-mail</Label>
                    <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="senha2">Senha</Label>
                    <Input id="senha2" type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="codigo">Código de acesso</Label>
                    <Input
                      id="codigo"
                      required
                      placeholder="Ex.: LIVRO-ABC123"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    />
                    <p className="text-xs text-muted-foreground">
                      Cadastro fechado. Solicite um código ao administrador.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <input
                      id="aceite"
                      type="checkbox"
                      checked={aceitouTermos}
                      onChange={(e) => setAceitouTermos(e.target.checked)}
                      className="mt-0.5 accent-primary"
                    />
                    <label htmlFor="aceite" className="text-xs text-muted-foreground leading-relaxed">
                      Li e aceito os{" "}
                      <Link to="/termos" target="_blank" className="underline hover:text-foreground">Termos de Uso</Link>
                      {" "}e a{" "}
                      <Link to="/politica-privacidade" target="_blank" className="underline hover:text-foreground">Política de Privacidade</Link>.
                    </label>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || !aceitouTermos}>
                    {loading ? "Criando..." : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
            </div>
            <Button variant="outline" className="w-full" onClick={google}>
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Entrar com Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
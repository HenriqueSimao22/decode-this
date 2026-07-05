import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getActiveWorkspaceId } from "./workspace-helper";

// ---------- Listar / trocar workspace ativo ----------
export const listarWorkspaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Workspaces onde sou membro
    const { data: memb, error } = await context.supabase
      .from("workspace_members")
      .select("workspace_id, papel, cor, entrou_em, workspaces(id, nome, tipo, criado_por, created_at)")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (memb ?? []).map((m: any) => ({
      id: m.workspace_id,
      nome: m.workspaces?.nome,
      tipo: m.workspaces?.tipo,
      criado_por: m.workspaces?.criado_por,
      papel: m.papel,
      cor: m.cor,
      created_at: m.workspaces?.created_at,
    }));
  });

export const trocarWorkspaceAtivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspace_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Verifica membership
    const { data: m } = await context.supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", data.workspace_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!m) throw new Error("Você não é membro desse workspace");
    const { error } = await context.supabase
      .from("profiles")
      .update({ workspace_ativo: data.workspace_id })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Criar workspace conjunto ----------
export const criarWorkspaceConjunto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ nome: z.string().trim().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: w, error } = await context.supabase
      .from("workspaces")
      .insert({ nome: data.nome, tipo: "conjunta", criado_por: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: e2 } = await context.supabase
      .from("workspace_members")
      .insert({ workspace_id: w.id, user_id: context.userId, papel: "dono", cor: "#6366f1" });
    if (e2) throw new Error(e2.message);
    // Semear categorias padrão
    const CAT_DEFAULT: Array<{ nome: string; tipo: "receita" | "despesa"; cor: string }> = [
      { nome: "Salário", tipo: "receita", cor: "#4CAF50" },
      { nome: "Freelance", tipo: "receita", cor: "#8BC34A" },
      { nome: "Investimentos", tipo: "receita", cor: "#009688" },
      { nome: "Outros", tipo: "receita", cor: "#607D8B" },
      { nome: "Alimentação", tipo: "despesa", cor: "#F44336" },
      { nome: "Moradia", tipo: "despesa", cor: "#E91E63" },
      { nome: "Transporte", tipo: "despesa", cor: "#FF9800" },
      { nome: "Saúde", tipo: "despesa", cor: "#9C27B0" },
      { nome: "Educação", tipo: "despesa", cor: "#3F51B5" },
      { nome: "Lazer", tipo: "despesa", cor: "#00BCD4" },
      { nome: "Compras", tipo: "despesa", cor: "#795548" },
      { nome: "Contas", tipo: "despesa", cor: "#FF5722" },
      { nome: "Outros", tipo: "despesa", cor: "#607D8B" },
    ];
    await context.supabase.from("categorias").insert(
      CAT_DEFAULT.map((c) => ({
        user_id: context.userId,
        workspace_id: w.id,
        criado_por: context.userId,
        nome: c.nome,
        tipo: c.tipo,
        cor: c.cor,
      })),
    );
    // Ativa
    await context.supabase.from("profiles").update({ workspace_ativo: w.id }).eq("id", context.userId);
    return { id: w.id };
  });

export const renomearWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), nome: z.string().trim().min(1).max(80) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workspaces")
      .update({ nome: data.nome })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Membros ----------
export const listarMembrosAtivos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("workspace_members")
      .select("user_id, papel, cor")
      .eq("workspace_id", wid);
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.user_id);
    if (ids.length === 0) return [];
    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id, nome, email, avatar_url")
      .in("id", ids);
    const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
    return (rows ?? []).map((r) => ({
      user_id: r.user_id,
      papel: r.papel,
      cor: r.cor,
      nome: profMap.get(r.user_id)?.nome ?? "Membro",
      email: profMap.get(r.user_id)?.email ?? null,
      avatar_url: profMap.get(r.user_id)?.avatar_url ?? null,
    }));
  });

export const listarMembros = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspace_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("workspace_members")
      .select("user_id, papel, cor, entrou_em")
      .eq("workspace_id", data.workspace_id);
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.user_id);
    if (ids.length === 0) return [];
    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id, nome, email, avatar_url")
      .in("id", ids);
    const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
    return (rows ?? []).map((r) => ({
      user_id: r.user_id,
      papel: r.papel,
      cor: r.cor,
      entrou_em: r.entrou_em,
      nome: profMap.get(r.user_id)?.nome ?? "Membro",
      email: profMap.get(r.user_id)?.email ?? null,
      avatar_url: profMap.get(r.user_id)?.avatar_url ?? null,
    }));
  });

export const atualizarCorMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      workspace_id: z.string().uuid(),
      user_id: z.string().uuid(),
      cor: z.string().regex(/^#([0-9a-fA-F]{6})$/),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workspace_members")
      .update({ cor: data.cor })
      .eq("workspace_id", data.workspace_id)
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removerMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ workspace_id: z.string().uuid(), user_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", data.workspace_id)
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Verifica se é dono
    const { data: m, error: e0 } = await context.supabase
      .from("workspace_members")
      .select("papel")
      .eq("workspace_id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (e0) throw new Error(e0.message);
    if (!m) throw new Error("Você não é membro deste workspace.");
    if (m.papel !== "dono") throw new Error("Somente o dono pode excluir o workspace.");

    // Não pode ser o único workspace do usuário
    const { data: meusIds } = await context.supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", context.userId);
    const outros = (meusIds ?? []).filter((r) => r.workspace_id !== data.id);
    if (outros.length === 0)
      throw new Error("Este é seu único workspace. Crie outro antes de excluí-lo.");

    // Se era o ativo, aponta pra outro
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("workspace_ativo")
      .eq("id", context.userId)
      .maybeSingle();
    if (prof?.workspace_ativo === data.id) {
      await context.supabase
        .from("profiles")
        .update({ workspace_ativo: outros[0].workspace_id })
        .eq("id", context.userId);
    }

    // Apaga (cascata cuida dos filhos)
    const { error } = await context.supabase
      .from("workspaces")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, novo_ativo: outros[0].workspace_id };
  });

// ---------- Convites ----------
export const gerarConvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ workspace_id: z.string().uuid(), email: z.string().email().max(255) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("workspace_invites")
      .insert({
        workspace_id: data.workspace_id,
        email_convidado: data.email.toLowerCase(),
        criado_por: context.userId,
      })
      .select("id, token, expira_em")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listarConvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspace_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("workspace_invites")
      .select("id, email_convidado, token, status, expira_em, created_at, aceito_em")
      .eq("workspace_id", data.workspace_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const revogarConvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workspace_invites")
      .update({ status: "revogado" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const verConvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ token: z.string().min(10).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: inv, error } = await context.supabase
      .from("workspace_invites")
      .select("id, workspace_id, email_convidado, status, expira_em, workspaces(nome, tipo)")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) throw new Error("Convite não encontrado");
    return inv;
  });

export const aceitarConvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ token: z.string().min(10).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: inv, error } = await context.supabase
      .from("workspace_invites")
      .select("id, workspace_id, email_convidado, status, expira_em")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) throw new Error("Convite inválido");
    if (inv.status !== "pendente") throw new Error("Convite não está mais disponível");
    if (new Date(inv.expira_em) < new Date()) throw new Error("Convite expirado");

    // Verifica se o email do convite bate com o do usuário
    const email = (context.claims?.email as string | undefined) ?? "";
    if (email.toLowerCase() !== inv.email_convidado.toLowerCase()) {
      throw new Error(`Este convite é para ${inv.email_convidado}. Entre com essa conta.`);
    }

    // Cria membro
    const cores = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#8b5cf6", "#ec4899"];
    const cor = cores[Math.floor(Math.random() * cores.length)];
    const { error: eIns } = await context.supabase
      .from("workspace_members")
      .insert({ workspace_id: inv.workspace_id, user_id: context.userId, papel: "membro", cor });
    if (eIns && !/duplicate/i.test(eIns.message)) throw new Error(eIns.message);

    // Marca aceito
    await context.supabase
      .from("workspace_invites")
      .update({ status: "aceito", aceito_por: context.userId, aceito_em: new Date().toISOString() })
      .eq("id", inv.id);

    // Torna ativo
    await context.supabase
      .from("profiles")
      .update({ workspace_ativo: inv.workspace_id })
      .eq("id", context.userId);

    return { workspace_id: inv.workspace_id };
  });
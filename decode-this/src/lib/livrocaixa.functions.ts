import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getActiveWorkspaceId } from "./workspace-helper";

const TipoSchema = z.enum(["receita", "despesa"]);

// ---------- Perfil ----------
export const getPerfil = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, nome, email, avatar_url, tema, bloqueado, workspace_ativo")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.bloqueado) throw new Error("Conta bloqueada. Contate o administrador.");
    return data;
  });

export const atualizarPerfil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      nome: z.string().trim().min(1).max(100).optional(),
      tema: z.enum(["claro", "pergaminho", "escuro"]).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update(data)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Categorias ----------
export const listarCategorias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("categorias")
      .select("id, nome, tipo, cor")
      .eq("workspace_id", wid)
      .order("tipo")
      .order("nome");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const criarCategoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      nome: z.string().trim().min(1).max(60),
      tipo: TipoSchema,
      cor: z.string().max(20).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("categorias")
      .insert({ ...data, user_id: context.userId, workspace_id: wid, criado_por: context.userId })
      .select("id, nome, tipo, cor")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- Transações ----------
const TransacaoInput = z.object({
  tipo: TipoSchema,
  descricao: z.string().trim().min(1).max(200),
  valor: z.number().nonnegative().max(1_000_000_000),
  categoria_id: z.string().uuid().nullable().optional(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data deve ser YYYY-MM-DD"),
  observacao: z.string().max(500).nullable().optional(),
});

export const listarTransacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      tipo: TipoSchema.optional(),
      categoriaId: z.string().uuid().nullable().optional(),
      busca: z.string().max(100).optional(),
      criadoPor: z.string().uuid().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    let q = context.supabase
      .from("transacoes")
      .select("id, tipo, descricao, valor, categoria_id, data, observacao, criado_por, categorias(nome, cor)")
      .eq("workspace_id", wid)
      .order("data", { ascending: false })
      .order("created_at", { ascending: false });
    if (data.inicio) q = q.gte("data", data.inicio);
    if (data.fim) q = q.lte("data", data.fim);
    if (data.tipo) q = q.eq("tipo", data.tipo);
    if (data.categoriaId) q = q.eq("categoria_id", data.categoriaId);
    if (data.busca) q = q.ilike("descricao", `%${data.busca}%`);
    if (data.criadoPor) q = q.eq("criado_por", data.criadoPor);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const criarTransacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TransacaoInput.parse(d))
  .handler(async ({ data, context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("transacoes")
      .insert({ ...data, user_id: context.userId, workspace_id: wid, criado_por: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const atualizarTransacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).merge(TransacaoInput).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase
      .from("transacoes")
      .update(rest)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirTransacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("transacoes")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Resumo para dashboard ----------
export const resumoDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ ano: z.number().int().min(2000).max(2100) }).parse(d ?? { ano: new Date().getFullYear() }),
  )
  .handler(async ({ data, context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const ini = `${data.ano}-01-01`;
    const fim = `${data.ano}-12-31`;
    const { data: rows, error } = await context.supabase
      .from("transacoes")
      .select("tipo, valor, data, categoria_id, categorias(nome, cor)")
      .eq("workspace_id", wid)
      .gte("data", ini)
      .lte("data", fim);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------- Backup import / export ----------
const BackupSchema = z.object({
  transacoes: z
    .array(
      z.object({
        tipo: TipoSchema,
        descricao: z.string().min(1).max(200),
        valor: z.number().nonnegative(),
        data: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
        categoria: z.string().max(60).optional().nullable(),
        observacao: z.string().max(500).optional().nullable(),
      }),
    )
    .max(50000)
    .optional()
    .default([]),
  categorias: z
    .array(
      z.object({
        nome: z.string().min(1).max(60),
        tipo: TipoSchema,
        cor: z.string().max(20).optional().nullable(),
      }),
    )
    .max(500)
    .optional()
    .default([]),
});

export const importarBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BackupSchema.parse(d))
  .handler(async ({ data, context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    // Garantir categorias
    const { data: existentes } = await context.supabase
      .from("categorias")
      .select("id, nome, tipo")
      .eq("workspace_id", wid);
    const map = new Map<string, string>();
    for (const c of existentes ?? []) map.set(`${c.tipo}::${c.nome.toLowerCase()}`, c.id);

    let categoriasCriadas = 0;
    const paraCriar = [
      ...data.categorias.map((c) => ({ nome: c.nome, tipo: c.tipo, cor: c.cor ?? null })),
      ...data.transacoes
        .filter((t) => t.categoria && !map.has(`${t.tipo}::${t.categoria!.toLowerCase()}`))
        .map((t) => ({ nome: t.categoria!, tipo: t.tipo, cor: null })),
    ].filter(
      (c, i, arr) =>
        arr.findIndex((x) => x.nome.toLowerCase() === c.nome.toLowerCase() && x.tipo === c.tipo) === i,
    ).filter((c) => !map.has(`${c.tipo}::${c.nome.toLowerCase()}`));

    if (paraCriar.length) {
      const { data: novas, error } = await context.supabase
        .from("categorias")
        .insert(paraCriar.map((c) => ({ ...c, user_id: context.userId, workspace_id: wid, criado_por: context.userId })))
        .select("id, nome, tipo");
      if (error) throw new Error("Erro ao criar categorias: " + error.message);
      for (const c of novas ?? []) map.set(`${c.tipo}::${c.nome.toLowerCase()}`, c.id);
      categoriasCriadas = novas?.length ?? 0;
    }

    // Inserir transações em blocos
    const linhas = data.transacoes.map((t) => ({
      user_id: context.userId,
      workspace_id: wid,
      criado_por: context.userId,
      tipo: t.tipo,
      descricao: t.descricao,
      valor: t.valor,
      data: t.data.slice(0, 10),
      observacao: t.observacao ?? null,
      categoria_id: t.categoria
        ? map.get(`${t.tipo}::${t.categoria.toLowerCase()}`) ?? null
        : null,
    }));

    let transacoesImportadas = 0;
    for (let i = 0; i < linhas.length; i += 500) {
      const chunk = linhas.slice(i, i + 500);
      const { error } = await context.supabase.from("transacoes").insert(chunk);
      if (error) throw new Error("Erro ao importar transações: " + error.message);
      transacoesImportadas += chunk.length;
    }

    return { transacoesImportadas, categoriasCriadas };
  });

export const exportarBackup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const [{ data: transacoes }, { data: categorias }] = await Promise.all([
      context.supabase
        .from("transacoes")
        .select("tipo, descricao, valor, data, observacao, categorias(nome)")
        .eq("workspace_id", wid),
      context.supabase.from("categorias").select("nome, tipo, cor").eq("workspace_id", wid),
    ]);
    return {
      exportadoEm: new Date().toISOString(),
      versao: 1,
      categorias: categorias ?? [],
      transacoes: (transacoes ?? []).map((t) => ({
        tipo: t.tipo,
        descricao: t.descricao,
        valor: Number(t.valor),
        data: t.data,
        observacao: t.observacao,
        categoria: (t as any).categorias?.nome ?? null,
      })),
    };
  });
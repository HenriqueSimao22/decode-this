import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getActiveWorkspaceId } from "./workspace-helper";

// Busca (ou retorna vazio) o planejamento de um mês/ano específico, já com
// seus itens. Não cria nada sozinho — a criação acontece explicitamente em
// `iniciarPlanejamento`, na primeira vez que o usuário mexe no mês.
export const obterPlanejamento = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ mes: z.number().int().min(1).max(12), ano: z.number().int().min(2000).max(2100) }).parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { data: planejamento, error } = await context.supabase
      .from("planejamentos_mensais")
      .select("id, renda_planejada, observacao")
      .eq("workspace_id", wid)
      .eq("mes", data.mes)
      .eq("ano", data.ano)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!planejamento) return { planejamento: null, itens: [] as any[] };

    const { data: itens, error: eItens } = await context.supabase
      .from("planejamento_itens")
      .select("id, nome, valor_planejado, cor, ordem")
      .eq("planejamento_id", planejamento.id)
      .order("ordem", { ascending: true });
    if (eItens) throw new Error(eItens.message);

    return { planejamento, itens: itens ?? [] };
  });

// Cria o planejamento do mês (se ainda não existir) com a renda informada.
export const iniciarPlanejamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      mes: z.number().int().min(1).max(12),
      ano: z.number().int().min(2000).max(2100),
      renda_planejada: z.number().nonnegative().max(1_000_000_000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { data: existente } = await context.supabase
      .from("planejamentos_mensais")
      .select("id")
      .eq("workspace_id", wid)
      .eq("mes", data.mes)
      .eq("ano", data.ano)
      .maybeSingle();
    if (existente) return { id: existente.id };

    const { data: novo, error } = await context.supabase
      .from("planejamentos_mensais")
      .insert({ workspace_id: wid, criado_por: context.userId, mes: data.mes, ano: data.ano, renda_planejada: data.renda_planejada })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: novo.id };
  });

export const atualizarRendaPlanejada = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), renda_planejada: z.number().nonnegative().max(1_000_000_000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("planejamentos_mensais")
      .update({ renda_planejada: data.renda_planejada })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const criarItemPlanejamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      planejamento_id: z.string().uuid(),
      nome: z.string().trim().min(1).max(80),
      valor_planejado: z.number().nonnegative().max(1_000_000_000),
      cor: z.string().default("#B08D57"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { count } = await context.supabase
      .from("planejamento_itens")
      .select("id", { count: "exact", head: true })
      .eq("planejamento_id", data.planejamento_id);
    const { error } = await context.supabase.from("planejamento_itens").insert({
      planejamento_id: data.planejamento_id,
      workspace_id: wid,
      criado_por: context.userId,
      nome: data.nome,
      valor_planejado: data.valor_planejado,
      cor: data.cor,
      ordem: count ?? 0,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const editarItemPlanejamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      nome: z.string().trim().min(1).max(80),
      valor_planejado: z.number().nonnegative().max(1_000_000_000),
      cor: z.string(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("planejamento_itens")
      .update({ nome: data.nome, valor_planejado: data.valor_planejado, cor: data.cor })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirItemPlanejamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("planejamento_itens").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

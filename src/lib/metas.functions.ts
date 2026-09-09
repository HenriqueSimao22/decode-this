import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getActiveWorkspaceId } from "./workspace-helper";

const TipoMeta = z.enum(["economia", "gasto_maximo"]);

const MetaSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  tipo: TipoMeta,
  categoria_id: z.string().uuid().nullable().optional(),
  valor_alvo: z.number().positive().max(1_000_000_000),
  cor: z.string().regex(/^#([0-9a-fA-F]{6})$/).default("#B08D57"),
  icone: z.string().trim().min(1).max(40).default("target"),
  prazo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

// Progresso de uma meta de gasto_maximo é calculado dinamicamente a partir das
// transações de despesa do mês corrente na categoria vinculada.
async function progressoGastoMaximo(supabase: any, wid: string, categoriaId: string | null) {
  if (!categoriaId) return 0;
  const hoje = new Date();
  const inicio = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
  const fimDate = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const fim = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(fimDate.getDate()).padStart(2, "0")}`;
  const { data } = await supabase
    .from("transacoes")
    .select("valor")
    .eq("workspace_id", wid)
    .eq("tipo", "despesa")
    .eq("categoria_id", categoriaId)
    .gte("data", inicio)
    .lte("data", fim);
  return (data ?? []).reduce((a: number, r: any) => a + Number(r.valor), 0);
}

export const listarMetas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { data: metas, error } = await context.supabase
      .from("metas")
      .select("id, nome, tipo, categoria_id, valor_alvo, valor_atual, cor, icone, prazo, concluida, arquivada, criado_por, created_at, categorias(nome, cor)")
      .eq("workspace_id", wid)
      .eq("arquivada", false)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const resultado = [];
    for (const m of metas ?? []) {
      let atual = Number(m.valor_atual);
      if (m.tipo === "gasto_maximo") {
        atual = await progressoGastoMaximo(context.supabase, wid, m.categoria_id);
      }
      const pct = Math.min(100, Math.round((atual / Number(m.valor_alvo)) * 1000) / 10);
      resultado.push({ ...m, valor_atual_calculado: atual, progresso_pct: pct });
    }
    return resultado;
  });

export const criarMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MetaSchema.parse(d))
  .handler(async ({ data, context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("metas")
      .insert({ ...data, workspace_id: wid, criado_por: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const editarMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MetaSchema.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("metas").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("metas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const registrarAporte = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      meta_id: z.string().uuid(),
      valor: z.number().refine((v) => v !== 0, "Valor não pode ser zero"),
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      observacao: z.string().max(300).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { data: meta, error: eM } = await context.supabase
      .from("metas")
      .select("id, valor_atual, valor_alvo")
      .eq("id", data.meta_id)
      .maybeSingle();
    if (eM) throw new Error(eM.message);
    if (!meta) throw new Error("Meta não encontrada");
    const novoValor = Math.max(0, Number(meta.valor_atual) + data.valor);

    const { error: eIns } = await context.supabase.from("metas_aportes").insert({
      meta_id: data.meta_id,
      workspace_id: wid,
      criado_por: context.userId,
      valor: data.valor,
      data: data.data ?? new Date().toISOString().slice(0, 10),
      observacao: data.observacao ?? null,
    });
    if (eIns) throw new Error(eIns.message);

    const concluida = novoValor >= Number(meta.valor_alvo);
    const { error: eUp } = await context.supabase
      .from("metas")
      .update({ valor_atual: novoValor, concluida })
      .eq("id", data.meta_id);
    if (eUp) throw new Error(eUp.message);
    return { ok: true, valor_atual: novoValor, concluida };
  });

export const listarAportesMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ meta_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("metas_aportes")
      .select("id, valor, data, observacao, criado_por, created_at")
      .eq("meta_id", data.meta_id)
      .order("data", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const arquivarMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), arquivada: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("metas").update({ arquivada: data.arquivada }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Resumo enxuto para a "Visão Geral" — só o essencial para as barras de progresso.
export const resumoMetas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { data: metas, error } = await context.supabase
      .from("metas")
      .select("id, nome, tipo, categoria_id, valor_alvo, valor_atual, cor, icone, concluida")
      .eq("workspace_id", wid)
      .eq("arquivada", false)
      .order("created_at", { ascending: true })
      .limit(4);
    if (error) throw new Error(error.message);
    const resultado = [];
    for (const m of metas ?? []) {
      let atual = Number(m.valor_atual);
      if (m.tipo === "gasto_maximo") {
        atual = await progressoGastoMaximo(context.supabase, wid, m.categoria_id);
      }
      const pct = Math.min(100, Math.round((atual / Number(m.valor_alvo)) * 1000) / 10);
      resultado.push({ ...m, valor_atual_calculado: atual, progresso_pct: pct });
    }
    return resultado;
  });

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getActiveWorkspaceId } from "./workspace-helper";

const TipoInvestimento = z.enum(["acao", "fii", "renda_fixa", "cripto", "fundo", "outro"]);

const InvestimentoSchema = z.object({
  tipo: TipoInvestimento,
  nome: z.string().trim().min(1).max(120),
  ticker: z.string().trim().max(20).nullable().optional(),
  quantidade: z.number().nonnegative().max(1_000_000_000),
  preco_medio: z.number().nonnegative().max(1_000_000_000),
  valor_atual_unitario: z.number().nonnegative().max(1_000_000_000).nullable().optional(),
  cor: z.string().regex(/^#([0-9a-fA-F]{6})$/).default("#B08D57"),
  observacao: z.string().max(500).nullable().optional(),
});

export const listarInvestimentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("investimentos")
      .select("id, tipo, nome, ticker, quantidade, preco_medio, valor_atual_unitario, atualizado_em, cor, observacao, criado_por, created_at")
      .eq("workspace_id", wid)
      .eq("arquivado", false)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((i: any) => {
      const investido = Number(i.quantidade) * Number(i.preco_medio);
      const unitAtual = i.valor_atual_unitario != null ? Number(i.valor_atual_unitario) : Number(i.preco_medio);
      const atual = Number(i.quantidade) * unitAtual;
      const rentabilidade = investido > 0 ? Math.round(((atual - investido) / investido) * 10000) / 100 : 0;
      return { ...i, valor_investido: investido, valor_atual: atual, rentabilidade_pct: rentabilidade };
    });
  });

export const criarInvestimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InvestimentoSchema.parse(d))
  .handler(async ({ data, context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("investimentos")
      .insert({
        ...data,
        workspace_id: wid,
        criado_por: context.userId,
        atualizado_em: data.valor_atual_unitario != null ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const editarInvestimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InvestimentoSchema.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase
      .from("investimentos")
      .update({ ...rest, atualizado_em: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const atualizarValorInvestimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      valor_atual_unitario: z.number().nonnegative().max(1_000_000_000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("investimentos")
      .update({ valor_atual_unitario: data.valor_atual_unitario, atualizado_em: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirInvestimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("investimentos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const arquivarInvestimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), arquivado: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("investimentos").update({ arquivado: data.arquivado }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

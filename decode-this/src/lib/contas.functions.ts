import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getActiveWorkspaceId } from "./workspace-helper";

const TipoConta = z.enum(["pagar", "receber"]);
const Recorrencia = z.enum(["nenhuma", "semanal", "mensal", "anual"]);

const ContaBase = z.object({
  tipo: TipoConta,
  descricao: z.string().trim().min(1).max(200),
  valor: z.number().nonnegative().max(1_000_000_000),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoria_id: z.string().uuid().nullable().optional(),
  observacao: z.string().max(500).nullable().optional(),
  recorrencia: Recorrencia.default("nenhuma"),
  ocorrencias: z.number().int().min(1).max(60).default(1),
});

function addDate(iso: string, n: number, unit: "week" | "month" | "year"): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (unit === "week") dt.setUTCDate(dt.getUTCDate() + n * 7);
  else if (unit === "month") dt.setUTCMonth(dt.getUTCMonth() + n);
  else dt.setUTCFullYear(dt.getUTCFullYear() + n);
  return dt.toISOString().slice(0, 10);
}

export const listarContas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tipo: TipoConta.optional(),
      status: z.enum(["todas", "pendentes", "pagas", "atrasadas"]).default("todas"),
      inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      criadoPor: z.string().uuid().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    let q = context.supabase
      .from("contas")
      .select("id, tipo, descricao, valor, vencimento, categoria_id, observacao, pago_em, transacao_id, recorrencia, grupo_recorrencia, criado_por, categorias(nome, cor)")
      .eq("workspace_id", wid)
      .order("vencimento", { ascending: true });
    if (data.tipo) q = q.eq("tipo", data.tipo);
    if (data.inicio) q = q.gte("vencimento", data.inicio);
    if (data.fim) q = q.lte("vencimento", data.fim);
    if (data.criadoPor) q = q.eq("criado_por", data.criadoPor);
    if (data.status === "pagas") q = q.not("pago_em", "is", null);
    if (data.status === "pendentes") q = q.is("pago_em", null);
    if (data.status === "atrasadas") {
      const hoje = new Date().toISOString().slice(0, 10);
      q = q.is("pago_em", null).lt("vencimento", hoje);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const resumoContas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const hoje = new Date().toISOString().slice(0, 10);
    const em30 = addDate(hoje, 30, "week"); // ~7 meses; ok como janela
    const { data: rows, error } = await context.supabase
      .from("contas")
      .select("tipo, valor, vencimento, pago_em")
      .eq("workspace_id", wid)
      .is("pago_em", null)
      .lte("vencimento", em30);
    if (error) throw new Error(error.message);
    let atrasadas = 0, atrasadasValor = 0, proximas = 0, proximasValor = 0;
    for (const r of rows ?? []) {
      const v = Number(r.valor);
      const signed = r.tipo === "pagar" ? -v : v;
      if (r.vencimento < hoje) {
        atrasadas++;
        atrasadasValor += signed;
      } else {
        proximas++;
        proximasValor += signed;
      }
    }
    return { atrasadas, atrasadasValor, proximas, proximasValor };
  });

export const criarConta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ContaBase.parse(d))
  .handler(async ({ data, context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const isRec = data.recorrencia !== "nenhuma" && data.ocorrencias > 1;
    const grupo = isRec ? crypto.randomUUID() : null;
    const unit = data.recorrencia === "semanal" ? "week" : data.recorrencia === "anual" ? "year" : "month";
    const total = isRec ? data.ocorrencias : 1;
    const rows = Array.from({ length: total }, (_, i) => ({
      user_id: context.userId,
      workspace_id: wid,
      criado_por: context.userId,
      tipo: data.tipo,
      descricao: total > 1 ? `${data.descricao} (${i + 1}/${total})` : data.descricao,
      valor: data.valor,
      vencimento: i === 0 ? data.vencimento : addDate(data.vencimento, i, unit as any),
      categoria_id: data.categoria_id ?? null,
      observacao: data.observacao ?? null,
      recorrencia: data.recorrencia,
      grupo_recorrencia: grupo,
    }));
    const { error } = await context.supabase.from("contas").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, criadas: rows.length };
  });

export const atualizarConta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      tipo: TipoConta,
      descricao: z.string().trim().min(1).max(200),
      valor: z.number().nonnegative().max(1_000_000_000),
      vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      categoria_id: z.string().uuid().nullable().optional(),
      observacao: z.string().max(500).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("contas").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirConta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      escopo: z.enum(["uma", "grupo"]).default("uma"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.escopo === "grupo") {
      const { data: alvo } = await context.supabase
        .from("contas").select("grupo_recorrencia").eq("id", data.id).maybeSingle();
      if (alvo?.grupo_recorrencia) {
        const { error } = await context.supabase
          .from("contas").delete().eq("grupo_recorrencia", alvo.grupo_recorrencia).is("pago_em", null);
        if (error) throw new Error(error.message);
        return { ok: true };
      }
    }
    const { error } = await context.supabase.from("contas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const marcarPago = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      dataPagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { data: conta, error: e1 } = await context.supabase
      .from("contas")
      .select("id, tipo, descricao, valor, categoria_id, observacao, pago_em")
      .eq("id", data.id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!conta) throw new Error("Conta não encontrada");
    if (conta.pago_em) throw new Error("Conta já foi paga");
    const dataTx = data.dataPagamento ?? new Date().toISOString().slice(0, 10);
    const { data: tx, error: e2 } = await context.supabase
      .from("transacoes")
      .insert({
        user_id: context.userId,
        workspace_id: wid,
        criado_por: context.userId,
        tipo: conta.tipo === "pagar" ? "despesa" : "receita",
        descricao: conta.descricao,
        valor: conta.valor,
        data: dataTx,
        categoria_id: conta.categoria_id,
        observacao: conta.observacao,
      })
      .select("id")
      .single();
    if (e2) throw new Error(e2.message);
    const { error: e3 } = await context.supabase
      .from("contas")
      .update({ pago_em: new Date().toISOString(), transacao_id: tx.id })
      .eq("id", data.id);
    if (e3) throw new Error(e3.message);
    return { ok: true };
  });

export const desmarcarPago = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: conta } = await context.supabase
      .from("contas").select("transacao_id").eq("id", data.id).maybeSingle();
    if (conta?.transacao_id) {
      await context.supabase.from("transacoes").delete().eq("id", conta.transacao_id);
    }
    const { error } = await context.supabase
      .from("contas").update({ pago_em: null, transacao_id: null }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
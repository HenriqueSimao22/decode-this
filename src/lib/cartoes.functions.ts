import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getActiveWorkspaceId } from "./workspace-helper";

// --------- helpers de fatura ---------
function daysInMonth(ano: number, mes0: number) {
  return new Date(ano, mes0 + 1, 0).getDate();
}
function dateStr(ano: number, mes0: number, dia: number) {
  const dim = daysInMonth(ano, mes0);
  const d = Math.min(dia, dim);
  return `${ano}-${String(mes0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function computeFaturaDatas(anoRef: number, mesRef0: number, diaFec: number, diaVen: number) {
  const data_fechamento = dateStr(anoRef, mesRef0, diaFec);
  // vencimento é a próxima ocorrência de diaVen após o fechamento
  let ano2 = anoRef;
  let mes2 = mesRef0;
  if (diaVen <= diaFec) {
    mes2 = mesRef0 + 1;
    if (mes2 > 11) { mes2 = 0; ano2 = anoRef + 1; }
  }
  const data_vencimento = dateStr(ano2, mes2, diaVen);
  return {
    mes_referencia: dateStr(anoRef, mesRef0, 1),
    data_fechamento,
    data_vencimento,
  };
}
function faturaRefFromCompra(dataCompra: string, diaFec: number) {
  // dataCompra = YYYY-MM-DD
  const [ano, mes, dia] = dataCompra.split("-").map(Number);
  const mes0 = mes - 1;
  if (dia <= diaFec) return { ano, mes0 };
  const nm = mes0 + 1;
  if (nm > 11) return { ano: ano + 1, mes0: 0 };
  return { ano, mes0: nm };
}
function addMeses(ano: number, mes0: number, n: number) {
  const total = mes0 + n;
  const add = Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  return { ano: ano + add, mes0: m };
}

async function ensureFatura(
  supabase: any,
  cartao: { id: string; workspace_id: string; dia_fechamento: number; dia_vencimento: number },
  ano: number,
  mes0: number,
) {
  const datas = computeFaturaDatas(ano, mes0, cartao.dia_fechamento, cartao.dia_vencimento);
  const { data: existing } = await supabase
    .from("faturas")
    .select("id, status")
    .eq("cartao_id", cartao.id)
    .eq("mes_referencia", datas.mes_referencia)
    .maybeSingle();
  if (existing) return { id: existing.id, ...datas };
  const { data: created, error } = await supabase
    .from("faturas")
    .insert({
      cartao_id: cartao.id,
      workspace_id: cartao.workspace_id,
      mes_referencia: datas.mes_referencia,
      data_fechamento: datas.data_fechamento,
      data_vencimento: datas.data_vencimento,
      status: "aberta",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: created.id, ...datas };
}

// Recalcula se o cartão deve ficar bloqueado (total em aberto > limite) e persiste o estado.
async function recalcularBloqueio(supabase: any, cartaoId: string) {
  const { data: cartao } = await supabase
    .from("cartoes")
    .select("id, limite, bloqueado")
    .eq("id", cartaoId)
    .maybeSingle();
  if (!cartao) return { bloqueado: false, total: 0 };
  const { data: linhas } = await supabase
    .from("transacoes_cartao")
    .select("valor_parcela, fatura_id, faturas!inner(status)")
    .eq("cartao_id", cartaoId);
  const total = (linhas ?? [])
    .filter((l: any) => l.faturas?.status !== "paga")
    .reduce((a: number, l: any) => a + Number(l.valor_parcela), 0);
  const deveBloquear = cartao.limite != null && total > Number(cartao.limite);
  if (deveBloquear !== cartao.bloqueado) {
    supabase.from("cartoes").update({ bloqueado: deveBloquear }).eq("id", cartaoId).then(() => {});
  }
  return { bloqueado: deveBloquear, total };
}

// --------- CRUD Cartões ---------
export const listarCartoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { data: cartoes, error } = await context.supabase
      .from("cartoes")
      .select("id, nome, banco, bandeira, cor, limite, dia_fechamento, dia_vencimento, ativo, bloqueado, criado_por, created_at")
      .eq("workspace_id", wid)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    // Totais da fatura "atual" (próxima em aberto/fechada) por cartão
    const ids = (cartoes ?? []).map((c: any) => c.id);
    if (ids.length === 0) return [];
    const { data: linhas } = await context.supabase
      .from("transacoes_cartao")
      .select("cartao_id, valor_parcela, fatura_id, faturas!inner(status, mes_referencia)")
      .in("cartao_id", ids);
    const totalPorCartao = new Map<string, number>();
    for (const l of linhas ?? []) {
      const st = (l as any).faturas?.status;
      if (st === "paga") continue;
      totalPorCartao.set(l.cartao_id, (totalPorCartao.get(l.cartao_id) ?? 0) + Number(l.valor_parcela));
    }
    const resultado = (cartoes ?? []).map((c: any) => {
      const total = totalPorCartao.get(c.id) ?? 0;
      const deveBloquear = c.limite != null && total > Number(c.limite);
      if (deveBloquear !== c.bloqueado) {
        // Auto-correção em segundo plano — nunca deve travar/atrasar a resposta da listagem.
        context.supabase.from("cartoes").update({ bloqueado: deveBloquear }).eq("id", c.id).then(() => {});
      }
      return { ...c, bloqueado: deveBloquear, total_em_aberto: total };
    });
    return resultado;
  });

const cartaoSchema = z.object({
  nome: z.string().trim().min(1).max(80),
  banco: z.string().trim().min(1).max(40),
  bandeira: z.string().trim().min(1).max(40),
  cor: z.string().regex(/^#([0-9a-fA-F]{6})$/),
  limite: z.number().nonnegative().nullable(),
  dia_fechamento: z.number().int().min(1).max(31),
  dia_vencimento: z.number().int().min(1).max(31),
});

export const criarCartao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => cartaoSchema.parse(d))
  .handler(async ({ data, context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("cartoes")
      .insert({ ...data, workspace_id: wid, criado_por: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const editarCartao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => cartaoSchema.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase
      .from("cartoes")
      .update(rest)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const arquivarCartao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), ativo: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("cartoes")
      .update({ ativo: data.ativo })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirCartao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("cartoes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --------- Faturas ---------
export const listarFaturasCartao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cartao_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("faturas")
      .select("id, mes_referencia, data_fechamento, data_vencimento, status, pago_em")
      .eq("cartao_id", data.cartao_id)
      .order("mes_referencia", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const verFatura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      cartao_id: z.string().uuid(),
      mes_referencia: z.string().regex(/^\d{4}-\d{2}-01$/),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { data: cartao, error: eC } = await context.supabase
      .from("cartoes")
      .select("id, nome, banco, bandeira, cor, limite, dia_fechamento, dia_vencimento, ativo, bloqueado, workspace_id")
      .eq("id", data.cartao_id)
      .maybeSingle();
    if (eC) throw new Error(eC.message);
    if (!cartao) throw new Error("Cartão não encontrado");

    let { data: fatura } = await context.supabase
      .from("faturas")
      .select("id, mes_referencia, data_fechamento, data_vencimento, status, pago_em, transacao_pagamento_id")
      .eq("cartao_id", data.cartao_id)
      .eq("mes_referencia", data.mes_referencia)
      .maybeSingle();

    // Se não existe fatura pra esse mês, calcula datas mas não persiste
    let linhas: any[] = [];
    if (fatura) {
      const { data: linhasRaw } = await context.supabase
        .from("transacoes_cartao")
        .select("id, descricao, valor_total, valor_parcela, parcelas_total, parcela_atual, data_compra, categoria_id, criado_por, grupo_compra_id, observacao, categorias(nome, cor)")
        .eq("fatura_id", fatura.id)
        .order("data_compra", { ascending: true });
      linhas = linhasRaw ?? [];
    } else {
      const [ano, mes] = data.mes_referencia.split("-").map(Number);
      const datas = computeFaturaDatas(ano, mes - 1, cartao.dia_fechamento, cartao.dia_vencimento);
      fatura = { id: null, ...datas, status: "aberta", pago_em: null, transacao_pagamento_id: null } as any;
    }
    const total = linhas.reduce((a, l) => a + Number(l.valor_parcela), 0);

    // total_em_aberto = soma de TODAS as faturas não pagas do cartão (não só a do mês em tela)
    const { data: linhasAbertas } = await context.supabase
      .from("transacoes_cartao")
      .select("valor_parcela, faturas!inner(status)")
      .eq("cartao_id", data.cartao_id);
    const totalEmAberto = (linhasAbertas ?? [])
      .filter((l: any) => l.faturas?.status !== "paga")
      .reduce((a: number, l: any) => a + Number(l.valor_parcela), 0);
    const deveBloquear = cartao.limite != null && totalEmAberto > Number(cartao.limite);
    if (deveBloquear !== cartao.bloqueado) {
      cartao.bloqueado = deveBloquear;
      // Auto-correção em segundo plano — nunca deve travar/atrasar a resposta da fatura.
      context.supabase.from("cartoes").update({ bloqueado: deveBloquear }).eq("id", cartao.id).then(() => {});
    }

    return { cartao, fatura, linhas, total, total_em_aberto: totalEmAberto };
  });

// --------- Compras ---------
const compraSchema = z.object({
  cartao_id: z.string().uuid(),
  descricao: z.string().trim().min(1).max(200),
  valor_total: z.number().positive(),
  data_compra: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  parcelas: z.number().int().min(1).max(48),
  categoria_id: z.string().uuid().nullable(),
  observacao: z.string().max(500).nullable(),
});

export const lancarCompraCartao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => compraSchema.parse(d))
  .handler(async ({ data, context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { data: cartao, error: eC } = await context.supabase
      .from("cartoes")
      .select("id, workspace_id, dia_fechamento, dia_vencimento, limite, bloqueado")
      .eq("id", data.cartao_id)
      .maybeSingle();
    if (eC) throw new Error(eC.message);
    if (!cartao) throw new Error("Cartão não encontrado");
    if (cartao.bloqueado) {
      throw new Error("Cartão bloqueado por limite excedido. Pague a fatura para poder usar novamente.");
    }

    const valorParcela = Math.round((data.valor_total / data.parcelas) * 100) / 100;
    // ajuste de centavos na última
    const somaParciais = valorParcela * data.parcelas;
    const ajuste = Math.round((data.valor_total - somaParciais) * 100) / 100;

    const inicio = faturaRefFromCompra(data.data_compra, cartao.dia_fechamento);
    const grupo_compra_id = crypto.randomUUID();

    const linhas: any[] = [];
    for (let i = 0; i < data.parcelas; i++) {
      const ref = addMeses(inicio.ano, inicio.mes0, i);
      const fat = await ensureFatura(context.supabase, cartao as any, ref.ano, ref.mes0);
      const isLast = i === data.parcelas - 1;
      linhas.push({
        cartao_id: cartao.id,
        fatura_id: fat.id,
        workspace_id: wid,
        criado_por: context.userId,
        categoria_id: data.categoria_id,
        grupo_compra_id,
        descricao: data.descricao,
        valor_total: data.valor_total,
        valor_parcela: isLast ? Math.round((valorParcela + ajuste) * 100) / 100 : valorParcela,
        parcelas_total: data.parcelas,
        parcela_atual: i + 1,
        data_compra: data.data_compra,
        observacao: data.observacao,
      });
    }
    const { error } = await context.supabase.from("transacoes_cartao").insert(linhas);
    if (error) throw new Error(error.message);
    const { bloqueado, total } = await recalcularBloqueio(context.supabase, cartao.id);
    return { ok: true, grupo_compra_id, bloqueado, total_em_aberto: total, limite: cartao.limite };
  });

export const excluirCompraCartao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      escopo: z.enum(["uma", "grupo"]).default("grupo"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: origem } = await context.supabase
      .from("transacoes_cartao")
      .select("cartao_id, grupo_compra_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!origem) throw new Error("Compra não encontrada");

    if (data.escopo === "uma") {
      const { error } = await context.supabase.from("transacoes_cartao").delete().eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("transacoes_cartao")
        .delete()
        .eq("grupo_compra_id", origem.grupo_compra_id);
      if (error) throw new Error(error.message);
    }
    const { bloqueado } = await recalcularBloqueio(context.supabase, origem.cartao_id);
    return { ok: true, bloqueado };
  });

// --------- Pagar fatura ---------
export const pagarFatura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      fatura_id: z.string().uuid(),
      data_pagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      categoria_id: z.string().uuid().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { data: fatura, error: eF } = await context.supabase
      .from("faturas")
      .select("id, cartao_id, status, cartoes(nome)")
      .eq("id", data.fatura_id)
      .maybeSingle();
    if (eF) throw new Error(eF.message);
    if (!fatura) throw new Error("Fatura não encontrada");
    if (fatura.status === "paga") throw new Error("Fatura já paga");

    const { data: linhas } = await context.supabase
      .from("transacoes_cartao")
      .select("valor_parcela")
      .eq("fatura_id", data.fatura_id);
    const total = (linhas ?? []).reduce((a: number, l: any) => a + Number(l.valor_parcela), 0);
    if (total <= 0) throw new Error("Fatura sem valor a pagar");

    const nomeCartao = (fatura as any).cartoes?.nome ?? "Cartão";
    const { data: trx, error: eIns } = await context.supabase
      .from("transacoes")
      .insert({
        user_id: context.userId,
        workspace_id: wid,
        criado_por: context.userId,
        tipo: "despesa",
        descricao: `Pagamento fatura ${nomeCartao}`,
        valor: total,
        data: data.data_pagamento,
        categoria_id: data.categoria_id,
      })
      .select("id")
      .single();
    if (eIns) throw new Error(eIns.message);

    const { error: eUp } = await context.supabase
      .from("faturas")
      .update({
        status: "paga",
        pago_em: new Date(data.data_pagamento + "T12:00:00").toISOString(),
        transacao_pagamento_id: trx.id,
      })
      .eq("id", data.fatura_id);
    if (eUp) throw new Error(eUp.message);
    await recalcularBloqueio(context.supabase, fatura.cartao_id);
    return { ok: true, transacao_id: trx.id };
  });

// --------- Faturas espelhadas na aba Contas ---------
const MESES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export const listarFaturasComoContas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { data: faturas, error } = await context.supabase
      .from("faturas")
      .select("id, cartao_id, mes_referencia, data_vencimento, status, cartoes(nome, cor)")
      .eq("workspace_id", wid)
      .neq("status", "paga")
      .order("data_vencimento", { ascending: true });
    if (error) throw new Error(error.message);
    const ids = (faturas ?? []).map((f: any) => f.id);
    if (ids.length === 0) return [];
    const { data: linhas } = await context.supabase
      .from("transacoes_cartao")
      .select("fatura_id, valor_parcela")
      .in("fatura_id", ids);
    const totais = new Map<string, number>();
    for (const l of linhas ?? []) {
      totais.set(l.fatura_id, (totais.get(l.fatura_id) ?? 0) + Number(l.valor_parcela));
    }
    return (faturas ?? [])
      .map((f: any) => {
        const [, mes] = f.mes_referencia.split("-");
        const valor = totais.get(f.id) ?? 0;
        return {
          id: f.id,
          origem: "fatura" as const,
          cartao_id: f.cartao_id,
          tipo: "pagar" as const,
          descricao: `Fatura ${MESES_ABREV[Number(mes) - 1]} — ${f.cartoes?.nome ?? "Cartão"}`,
          valor,
          vencimento: f.data_vencimento,
          status_fatura: f.status as "aberta" | "fechada",
          cor: f.cartoes?.cor ?? null,
        };
      })
      .filter((f: any) => f.valor > 0);
  });

export const desfazerPagamentoFatura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ fatura_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: fatura } = await context.supabase
      .from("faturas")
      .select("id, cartao_id, transacao_pagamento_id, data_fechamento")
      .eq("id", data.fatura_id)
      .maybeSingle();
    if (!fatura) throw new Error("Fatura não encontrada");
    if (fatura.transacao_pagamento_id) {
      await context.supabase.from("transacoes").delete().eq("id", fatura.transacao_pagamento_id);
    }
    const hoje = new Date().toISOString().slice(0, 10);
    const novoStatus = hoje >= (fatura as any).data_fechamento ? "fechada" : "aberta";
    const { error } = await context.supabase
      .from("faturas")
      .update({ status: novoStatus, pago_em: null, transacao_pagamento_id: null })
      .eq("id", data.fatura_id);
    if (error) throw new Error(error.message);
    await recalcularBloqueio(context.supabase, fatura.cartao_id);
    return { ok: true };
  });
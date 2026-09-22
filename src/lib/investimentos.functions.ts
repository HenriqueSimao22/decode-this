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

// Mapa de tickers comuns de cripto -> id usado pela CoinGecko (mesma lista da
// Edge Function "atualizar-cotacoes", que roda o mesmo processo 1x por dia).
const CRIPTO_IDS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", ADA: "cardano", BNB: "binancecoin",
  XRP: "ripple", DOGE: "dogecoin", LTC: "litecoin", USDT: "tether", USDC: "usd-coin",
  MATIC: "matic-network", POL: "matic-network", AVAX: "avalanche-2", DOT: "polkadot",
  LINK: "chainlink", TRX: "tron", SHIB: "shiba-inu", ATOM: "cosmos", UNI: "uniswap",
  XLM: "stellar", NEAR: "near", BCH: "bitcoin-cash", ETC: "ethereum-classic",
};

async function buscarPrecoAcaoFii(ticker: string, token: string): Promise<number | null> {
  try {
    const r = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(ticker)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j: any = await r.json().catch(() => null);
    const preco = j?.results?.[0]?.regularMarketPrice;
    return typeof preco === "number" && preco > 0 ? preco : null;
  } catch {
    return null;
  }
}

async function buscarPrecosCripto(tickers: string[]): Promise<Map<string, number>> {
  const resultado = new Map<string, number>();
  const ids = [...new Set(tickers.map((t) => CRIPTO_IDS[t.toUpperCase()]).filter(Boolean))];
  if (ids.length === 0) return resultado;
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=brl`);
    const j: any = await r.json().catch(() => ({}));
    for (const ticker of tickers) {
      const id = CRIPTO_IDS[ticker.toUpperCase()];
      const preco = id ? j?.[id]?.brl : undefined;
      if (typeof preco === "number" && preco > 0) resultado.set(ticker.toUpperCase(), preco);
    }
  } catch {
    /* mantém o mapa como está (sem essas cotações) */
  }
  return resultado;
}

// Atualiza manualmente (botão "Atualizar cotações") as ações, FIIs e criptos
// do workspace atual. O mesmo processo também roda automaticamente 1x por
// dia via a Edge Function "atualizar-cotacoes" (ver supabase/functions).
export const atualizarCotacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const wid = await getActiveWorkspaceId(context.supabase, context.userId);
    const { data: itens, error } = await context.supabase
      .from("investimentos")
      .select("id, tipo, ticker")
      .eq("workspace_id", wid)
      .eq("arquivado", false)
      .not("ticker", "is", null)
      .in("tipo", ["acao", "fii", "cripto"]);
    if (error) throw new Error(error.message);
    if (!itens || itens.length === 0) return { atualizados: 0, falhas: [] as string[], total: 0 };

    const BRAPI_TOKEN = process.env.BRAPI_TOKEN;
    const falhas: string[] = [];
    let atualizados = 0;

    const cripto = itens.filter((i: any) => i.tipo === "cripto");
    const precosCripto = await buscarPrecosCripto(cripto.map((i: any) => i.ticker as string));

    for (const item of itens as any[]) {
      const ticker = (item.ticker as string).toUpperCase();
      let preco: number | null = null;

      if (item.tipo === "cripto") {
        preco = precosCripto.get(ticker) ?? null;
      } else if (BRAPI_TOKEN) {
        preco = await buscarPrecoAcaoFii(ticker, BRAPI_TOKEN);
        await new Promise((res) => setTimeout(res, 150)); // respeita o rate-limit do plano gratuito
      }

      if (preco == null) {
        falhas.push(ticker);
        continue;
      }
      const { error: upErr } = await context.supabase
        .from("investimentos")
        .update({ valor_atual_unitario: preco, atualizado_em: new Date().toISOString() })
        .eq("id", item.id);
      if (!upErr) atualizados++;
      else falhas.push(ticker);
    }

    return { atualizados, falhas: [...new Set(falhas)], total: itens.length };
  });

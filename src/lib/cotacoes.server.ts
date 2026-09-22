// Busca de cotações (brapi.dev para ações/FIIs, CoinGecko para cripto) e
// atualização do valor atual dos investimentos. Roda apenas no servidor.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CRIPTO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  ADA: "cardano",
  BNB: "binancecoin",
  XRP: "ripple",
  DOGE: "dogecoin",
  LTC: "litecoin",
  USDT: "tether",
  USDC: "usd-coin",
  MATIC: "matic-network",
  POL: "matic-network",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  LINK: "chainlink",
  TRX: "tron",
  SHIB: "shiba-inu",
  ATOM: "cosmos",
  UNI: "uniswap",
  XLM: "stellar",
  NEAR: "near",
  BCH: "bitcoin-cash",
  ETC: "ethereum-classic",
};

async function buscarAcoesFii(tickers: string[], token: string) {
  const resultados = new Map<string, number>();
  const falhas: string[] = [];
  for (const ticker of tickers) {
    try {
      const r = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(ticker)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j: any = await r.json().catch(() => null);
      const preco = j?.results?.[0]?.regularMarketPrice;
      if (typeof preco === "number" && preco > 0) resultados.set(ticker, preco);
      else falhas.push(ticker);
    } catch {
      falhas.push(ticker);
    }
    await new Promise((res) => setTimeout(res, 200));
  }
  return { resultados, falhas };
}

async function buscarCripto(tickers: string[]) {
  const resultados = new Map<string, number>();
  const semMapa = tickers.filter((t) => !CRIPTO_IDS[t.toUpperCase()]);
  const comMapa = tickers.filter((t) => CRIPTO_IDS[t.toUpperCase()]);
  const ids = [...new Set(comMapa.map((t) => CRIPTO_IDS[t.toUpperCase()]))];
  if (ids.length === 0) return { resultados, falhas: tickers };

  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=brl`,
    );
    const j: any = await r.json().catch(() => ({}));
    const falhas = [...semMapa];
    for (const ticker of comMapa) {
      const id = CRIPTO_IDS[ticker.toUpperCase()];
      const preco = j?.[id]?.brl;
      if (typeof preco === "number" && preco > 0) resultados.set(ticker, preco);
      else falhas.push(ticker);
    }
    return { resultados, falhas };
  } catch {
    return { resultados, falhas: tickers };
  }
}

export async function atualizarCotacoesDe(workspaceId: string | null) {
  const BRAPI_TOKEN = process.env["BRAPI_TOKEN"];

  let query = supabaseAdmin
    .from("investimentos")
    .select("id, tipo, ticker, workspace_id")
    .eq("arquivado", false)
    .not("ticker", "is", null)
    .in("tipo", ["acao", "fii", "cripto"]);
  if (workspaceId) query = query.eq("workspace_id", workspaceId);

  const { data: itens, error } = await query;
  if (error) throw new Error(error.message);
  if (!itens || itens.length === 0) return { atualizados: 0, falhas: [] as string[], total: 0 };

  const acoesFii = itens.filter((i: any) => i.tipo === "acao" || i.tipo === "fii");
  const cripto = itens.filter((i: any) => i.tipo === "cripto");

  let precosAcoes = new Map<string, number>();
  let falhasAcoes: string[] = [];
  if (acoesFii.length > 0) {
    const tickersUnicos = [...new Set(acoesFii.map((i: any) => (i.ticker as string).toUpperCase()))];
    if (!BRAPI_TOKEN) {
      falhasAcoes = tickersUnicos;
    } else {
      const r = await buscarAcoesFii(tickersUnicos, BRAPI_TOKEN);
      precosAcoes = r.resultados;
      falhasAcoes = r.falhas;
    }
  }

  let precosCripto = new Map<string, number>();
  let falhasCripto: string[] = [];
  if (cripto.length > 0) {
    const tickersUnicos = [...new Set(cripto.map((i: any) => (i.ticker as string).toUpperCase()))];
    const r = await buscarCripto(tickersUnicos);
    precosCripto = r.resultados;
    falhasCripto = r.falhas;
  }

  const agora = new Date().toISOString();
  let atualizados = 0;
  for (const item of itens as any[]) {
    const ticker = (item.ticker as string).toUpperCase();
    const preco = item.tipo === "cripto" ? precosCripto.get(ticker) : precosAcoes.get(ticker);
    if (preco == null) continue;
    const { error: upErr } = await supabaseAdmin
      .from("investimentos")
      .update({ valor_atual_unitario: preco, atualizado_em: agora })
      .eq("id", item.id);
    if (!upErr) atualizados++;
  }

  return {
    atualizados,
    falhas: [...new Set([...falhasAcoes, ...falhasCripto])],
    total: itens.length,
  };
}

// Busca cotações direto do navegador (client-side). Este projeto não permite
// criar Edge Functions, então a busca de preço roda aqui mesmo, no app:
//   - Ações/FIIs -> brapi.dev, usando um token público (VITE_BRAPI_TOKEN).
//     É uma troca aceita conscientemente: esse token só permite consultas de
//     cotação de mercado, sem acesso a nenhum dado pessoal ou financeiro do
//     usuário, então não tem problema em ele ficar visível no navegador.
//   - Criptomoedas -> CoinGecko, que já é pública e não usa token.
// Quem chama `buscarCotacoes` decide como persistir cada preço encontrado
// (normalmente via o server function `atualizarValorInvestimento`).

export const CRIPTO_IDS: Record<string, string> = {
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

export type ItemParaCotar = { id: string; tipo: string; ticker: string | null };
export type ResultadoCotacao = { atualizados: number; falhas: string[]; total: number };

async function buscarPrecoAcaoFii(ticker: string, token: string): Promise<number | null> {
  try {
    const r = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(ticker)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
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

export async function buscarCotacoes(
  itens: ItemParaCotar[],
  salvar: (id: string, preco: number) => Promise<void>,
): Promise<ResultadoCotacao> {
  const BRAPI_TOKEN = import.meta.env.VITE_BRAPI_TOKEN as string | undefined;
  const alvos = itens.filter((i) => i.ticker && (i.tipo === "acao" || i.tipo === "fii" || i.tipo === "cripto"));
  const falhas: string[] = [];
  let atualizados = 0;

  const cripto = alvos.filter((i) => i.tipo === "cripto");
  const precosCripto = await buscarPrecosCripto(cripto.map((i) => i.ticker as string));

  for (const item of alvos) {
    const ticker = (item.ticker as string).toUpperCase();
    let preco: number | null = null;

    if (item.tipo === "cripto") {
      preco = precosCripto.get(ticker) ?? null;
    } else if (!BRAPI_TOKEN) {
      falhas.push(ticker);
      continue;
    } else {
      preco = await buscarPrecoAcaoFii(ticker, BRAPI_TOKEN);
      // Respeita o rate-limit da API gratuita entre chamadas.
      await new Promise((res) => setTimeout(res, 150));
    }

    if (preco == null) {
      falhas.push(ticker);
      continue;
    }
    try {
      await salvar(item.id, preco);
      atualizados++;
    } catch {
      falhas.push(ticker);
    }
  }

  return { atualizados, falhas: [...new Set(falhas)], total: alvos.length };
}

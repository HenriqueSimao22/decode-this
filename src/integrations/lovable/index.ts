// Edge Function: atualizar-cotacoes
//
// Atualiza automaticamente o "valor_atual_unitario" dos investimentos do tipo
// ação, FII e criptomoeda, puxando a cotação de fontes públicas:
//   - Ações/FIIs -> brapi.dev (precisa de um token gratuito, ver BRAPI_TOKEN)
//   - Criptomoedas -> CoinGecko (não precisa de token)
//
// Dois jeitos de chamar esta função:
//   1) Pelo app (botão "Atualizar cotações"): o usuário logado chama com seu
//      próprio token de sessão + { workspace_id } no corpo. Só atualiza os
//      investimentos daquele workspace, depois de confirmar que o usuário é
//      membro dele.
//   2) Por um Job agendado (Cloud → Jobs, no Lovable): chamada sem um usuário
//      logado por trás (sem workspace_id reconhecível) -> atualiza os
//      investimentos de TODOS os workspaces.
//
// Segredos usados (Cloud → Secrets, ou `supabase secrets set NOME=valor`):
//   BRAPI_TOKEN  -> token gratuito criado em https://brapi.dev/dashboard
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY já são
// fornecidos automaticamente pelo ambiente de Edge Functions do Supabase.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapa de tickers comuns de cripto -> id usado pela CoinGecko.
// Pode crescer conforme surgirem novas moedas na carteira.
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function buscarAcoesFii(tickers: string[], token: string) {
  const resultados = new Map<string, number>();
  const falhas: string[] = [];
  for (const ticker of tickers) {
    try {
      const r = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(ticker)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json().catch(() => null);
      const preco = j?.results?.[0]?.regularMarketPrice;
      if (typeof preco === "number" && preco > 0) resultados.set(ticker, preco);
      else falhas.push(ticker);
    } catch {
      falhas.push(ticker);
    }
    // Respeita o rate-limit da API gratuita entre chamadas.
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
    const j = await r.json().catch(() => ({}));
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const BRAPI_TOKEN = Deno.env.get("BRAPI_TOKEN");

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* sem corpo (é assim que o Job agendado deve chamar) */
  }

  // workspaceIds === null -> atualizar todos os workspaces (chamada agendada,
  // sem um usuário logado reconhecível por trás).
  let workspaceIds: string[] | null = null;

  if (body?.workspace_id && token) {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (userData?.user) {
      const { data: membro } = await admin
        .from("workspace_members")
        .select("workspace_id")
        .eq("workspace_id", body.workspace_id)
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (!membro) return json({ error: "Sem acesso a este workspace" }, 403);
      workspaceIds = [body.workspace_id];
    }
  }

  let query = admin
    .from("investimentos")
    .select("id, tipo, ticker, workspace_id")
    .eq("arquivado", false)
    .not("ticker", "is", null)
    .in("tipo", ["acao", "fii", "cripto"]);
  if (workspaceIds) query = query.in("workspace_id", workspaceIds);

  const { data: itens, error } = await query;
  if (error) return json({ error: error.message }, 500);
  if (!itens || itens.length === 0) return json({ atualizados: 0, falhas: [], total: 0 });

  const acoesFii = itens.filter((i: any) => i.tipo === "acao" || i.tipo === "fii");
  const cripto = itens.filter((i: any) => i.tipo === "cripto");

  let precosAcoes = new Map<string, number>();
  let falhasAcoes: string[] = [];
  if (acoesFii.length > 0) {
    if (!BRAPI_TOKEN) {
      falhasAcoes = [...new Set(acoesFii.map((i: any) => i.ticker!))];
    } else {
      const tickersUnicos = [...new Set(acoesFii.map((i: any) => (i.ticker as string).toUpperCase()))];
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
    const { error: upErr } = await admin
      .from("investimentos")
      .update({ valor_atual_unitario: preco, atualizado_em: agora })
      .eq("id", item.id);
    if (!upErr) atualizados++;
  }

  return json({
    atualizados,
    falhas: [...new Set([...falhasAcoes, ...falhasCripto])],
    total: itens.length,
  });
});

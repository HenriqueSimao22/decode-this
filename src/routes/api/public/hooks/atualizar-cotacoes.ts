import { createFileRoute } from "@tanstack/react-router";

// Endpoint chamado pelo agendamento diário (dias úteis, 19h de Brasília).
// Atualiza as cotações de ações, FIIs e criptos de todos os workspaces.
// Protegido pelo segredo CRON_SECRET no cabeçalho Authorization.
export const Route = createFileRoute("/api/public/hooks/atualizar-cotacoes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        const header = request.headers.get("authorization") ?? "";
        const token = header.replace(/^Bearer\s+/i, "");
        if (!secret || token !== secret) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { atualizarCotacoesDe } = await import("@/lib/cotacoes.server");
        try {
          const resultado = await atualizarCotacoesDe(null);
          return Response.json({ ok: true, ...resultado });
        } catch (e) {
          console.error("[atualizar-cotacoes] falha", e);
          return new Response(JSON.stringify({ ok: false }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

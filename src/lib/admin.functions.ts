import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso restrito ao administrador.");
}

function gerarCodigo(prefixo = "LIVRO") {
  const alfa = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alfa[Math.floor(Math.random() * alfa.length)];
  return `${prefixo}-${s}`;
}

export const souAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { admin: Boolean(data) };
  });

export const listarCodigos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("access_codes")
      .select("id, code, status, notas, usado_por, usado_em, expira_em, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const gerarCodigos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      quantidade: z.number().int().min(1).max(100),
      prefixo: z.string().trim().min(1).max(10).default("LIVRO"),
      notas: z.string().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const linhas = Array.from({ length: data.quantidade }, () => ({
      code: gerarCodigo(data.prefixo),
      notas: data.notas ?? null,
      criado_por: context.userId,
    }));
    const { data: rows, error } = await context.supabase
      .from("access_codes")
      .insert(linhas)
      .select("id, code, status, notas, created_at");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const revogarCodigo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("access_codes")
      .update({ status: "revogado" })
      .eq("id", data.id)
      .eq("status", "ativo");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirCodigo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error: e0 } = await context.supabase
      .from("access_codes")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    if (e0) throw new Error(e0.message);
    if (!row) throw new Error("Código não encontrado.");
    if (row.status !== "revogado")
      throw new Error("Só é possível excluir códigos revogados. Revogue primeiro.");
    const { error } = await context.supabase
      .from("access_codes")
      .delete()
      .eq("id", data.id)
      .eq("status", "revogado");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listarUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: perfis, error } = await context.supabase
      .from("profiles")
      .select("id, nome, email, bloqueado, codigo_usado, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (perfis ?? []).map((p: any) => p.id);
    const { data: roles } = ids.length
      ? await context.supabase.from("user_roles").select("user_id, role").in("user_id", ids)
      : { data: [] as any[] };
    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    }
    return (perfis ?? []).map((p: any) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
  });

export const definirBloqueio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), bloqueado: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Você não pode bloquear a si mesmo.");
    const { error } = await context.supabase
      .from("profiles")
      .update({ bloqueado: data.bloqueado })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const definirAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), admin: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId && !data.admin)
      throw new Error("Você não pode remover seu próprio acesso admin.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.admin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
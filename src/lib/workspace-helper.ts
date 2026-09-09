// Helper server-side: resolve o workspace ativo do usuário a partir do profile.
export async function getActiveWorkspaceId(
  supabase: any,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("workspace_ativo")
    .eq("id", userId)
    .maybeSingle();
  if (data?.workspace_ativo) return data.workspace_ativo as string;

  const { data: m } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!m?.workspace_id) throw new Error("Nenhum workspace disponível");
  await supabase.from("profiles").update({ workspace_ativo: m.workspace_id }).eq("id", userId);
  return m.workspace_id as string;
}
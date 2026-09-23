-- ============ PLANEJAMENTO MENSAL ============
-- Espaço de simulação independente das categorias/transações reais do app.
-- O usuário define uma renda planejada e divide esse valor entre categorias
-- próprias (criadas livremente, sem relação com public.categorias), pra
-- organizar/direcionar o dinheiro do mês. Também guarda o histórico de
-- conversas com o assistente de IA, por planejamento.

CREATE TABLE public.planejamentos_mensais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  mes smallint NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano smallint NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
  renda_planejada numeric(14,2) NOT NULL DEFAULT 0 CHECK (renda_planejada >= 0),
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, mes, ano)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planejamentos_mensais TO authenticated;

ALTER TABLE public.planejamentos_mensais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planejamentos_mensais_members_all" ON public.planejamentos_mensais FOR ALL
  USING (private.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (private.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER trg_planejamentos_mensais_updated_at BEFORE UPDATE ON public.planejamentos_mensais
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_planejamentos_mensais_workspace ON public.planejamentos_mensais(workspace_id);

-- Categorias/itens do planejamento (independentes de public.categorias)
CREATE TABLE public.planejamento_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planejamento_id uuid NOT NULL REFERENCES public.planejamentos_mensais(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nome text NOT NULL,
  valor_planejado numeric(14,2) NOT NULL DEFAULT 0 CHECK (valor_planejado >= 0),
  cor text NOT NULL DEFAULT '#B08D57',
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planejamento_itens TO authenticated;

ALTER TABLE public.planejamento_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planejamento_itens_members_all" ON public.planejamento_itens FOR ALL
  USING (private.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (private.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER trg_planejamento_itens_updated_at BEFORE UPDATE ON public.planejamento_itens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_planejamento_itens_planejamento ON public.planejamento_itens(planejamento_id);

-- Histórico de conversa com o assistente de IA, por planejamento mensal.
-- (A Edge/rota que efetivamente chama o AI Gateway é responsabilidade do
-- Lovable configurar; esta tabela só guarda o histórico.)
CREATE TABLE public.planejamento_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planejamento_id uuid NOT NULL REFERENCES public.planejamentos_mensais(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  conteudo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planejamento_mensagens TO authenticated;

ALTER TABLE public.planejamento_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planejamento_mensagens_members_all" ON public.planejamento_mensagens FOR ALL
  USING (private.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (private.is_workspace_member(workspace_id, auth.uid()));

CREATE INDEX idx_planejamento_mensagens_planejamento ON public.planejamento_mensagens(planejamento_id);

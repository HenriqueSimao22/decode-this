-- ============ CARTÕES: bloqueio por limite excedido ============
ALTER TABLE public.cartoes
  ADD COLUMN bloqueado boolean NOT NULL DEFAULT false;

-- ============ METAS ============
CREATE TABLE public.metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'economia' CHECK (tipo IN ('economia', 'gasto_maximo')),
  categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  valor_alvo numeric(14,2) NOT NULL CHECK (valor_alvo > 0),
  valor_atual numeric(14,2) NOT NULL DEFAULT 0 CHECK (valor_atual >= 0),
  cor text NOT NULL DEFAULT '#B08D57',
  icone text NOT NULL DEFAULT 'target',
  prazo date,
  concluida boolean NOT NULL DEFAULT false,
  arquivada boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas TO authenticated;

ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metas_members_all" ON public.metas FOR ALL
  USING (private.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (private.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER trg_metas_updated_at BEFORE UPDATE ON public.metas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_metas_workspace ON public.metas(workspace_id);

-- Histórico de aportes/retiradas de uma meta de economia (linha do tempo)
CREATE TABLE public.metas_aportes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_id uuid NOT NULL REFERENCES public.metas(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  valor numeric(14,2) NOT NULL, -- positivo = aporte, negativo = retirada
  data date NOT NULL DEFAULT CURRENT_DATE,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas_aportes TO authenticated;

ALTER TABLE public.metas_aportes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metas_aportes_members_all" ON public.metas_aportes FOR ALL
  USING (private.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (private.is_workspace_member(workspace_id, auth.uid()));

CREATE INDEX idx_metas_aportes_meta ON public.metas_aportes(meta_id);

-- ============ INVESTIMENTOS ============
CREATE TABLE public.investimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('acao', 'fii', 'renda_fixa', 'cripto', 'fundo', 'outro')),
  nome text NOT NULL,
  ticker text,
  quantidade numeric(18,8) NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  preco_medio numeric(14,4) NOT NULL DEFAULT 0 CHECK (preco_medio >= 0),
  valor_atual_unitario numeric(14,4),
  atualizado_em timestamptz,
  cor text NOT NULL DEFAULT '#B08D57',
  observacao text,
  arquivado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investimentos TO authenticated;

ALTER TABLE public.investimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "investimentos_members_all" ON public.investimentos FOR ALL
  USING (private.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (private.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER trg_investimentos_updated_at BEFORE UPDATE ON public.investimentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_investimentos_workspace ON public.investimentos(workspace_id);

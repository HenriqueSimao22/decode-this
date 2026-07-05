
-- ============ CARTÕES ============
CREATE TABLE public.cartoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nome text NOT NULL,
  banco text NOT NULL,
  bandeira text NOT NULL,
  cor text NOT NULL DEFAULT '#6366f1',
  limite numeric(14,2),
  dia_fechamento smallint NOT NULL CHECK (dia_fechamento BETWEEN 1 AND 31),
  dia_vencimento smallint NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cartoes TO authenticated;
GRANT ALL ON public.cartoes TO service_role;

ALTER TABLE public.cartoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cartoes_members_all" ON public.cartoes FOR ALL
  USING (private.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (private.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER trg_cartoes_updated_at BEFORE UPDATE ON public.cartoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_cartoes_workspace ON public.cartoes(workspace_id);

-- ============ FATURAS ============
CREATE TABLE public.faturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cartao_id uuid NOT NULL REFERENCES public.cartoes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  mes_referencia date NOT NULL, -- primeiro dia do mês
  data_fechamento date NOT NULL,
  data_vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','fechada','paga')),
  pago_em timestamptz,
  transacao_pagamento_id uuid REFERENCES public.transacoes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cartao_id, mes_referencia)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.faturas TO authenticated;
GRANT ALL ON public.faturas TO service_role;

ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faturas_members_all" ON public.faturas FOR ALL
  USING (private.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (private.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER trg_faturas_updated_at BEFORE UPDATE ON public.faturas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_faturas_cartao ON public.faturas(cartao_id);
CREATE INDEX idx_faturas_workspace ON public.faturas(workspace_id);

-- ============ TRANSAÇÕES DO CARTÃO ============
CREATE TABLE public.transacoes_cartao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cartao_id uuid NOT NULL REFERENCES public.cartoes(id) ON DELETE CASCADE,
  fatura_id uuid NOT NULL REFERENCES public.faturas(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  grupo_compra_id uuid NOT NULL,
  descricao text NOT NULL,
  valor_total numeric(14,2) NOT NULL, -- valor total da compra original
  valor_parcela numeric(14,2) NOT NULL,
  parcelas_total smallint NOT NULL DEFAULT 1 CHECK (parcelas_total BETWEEN 1 AND 48),
  parcela_atual smallint NOT NULL DEFAULT 1 CHECK (parcela_atual >= 1),
  data_compra date NOT NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transacoes_cartao TO authenticated;
GRANT ALL ON public.transacoes_cartao TO service_role;

ALTER TABLE public.transacoes_cartao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transacoes_cartao_members_all" ON public.transacoes_cartao FOR ALL
  USING (private.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (private.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER trg_transacoes_cartao_updated_at BEFORE UPDATE ON public.transacoes_cartao
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_transacoes_cartao_fatura ON public.transacoes_cartao(fatura_id);
CREATE INDEX idx_transacoes_cartao_cartao ON public.transacoes_cartao(cartao_id);
CREATE INDEX idx_transacoes_cartao_grupo ON public.transacoes_cartao(grupo_compra_id);

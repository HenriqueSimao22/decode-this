-- Registro de antecipações (pagamentos parciais antes do vencimento) de faturas de cartão.
CREATE TABLE public.fatura_antecipacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id uuid NOT NULL REFERENCES public.faturas(id) ON DELETE CASCADE,
  cartao_id uuid NOT NULL REFERENCES public.cartoes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  valor numeric(14,2) NOT NULL CHECK (valor > 0),
  transacao_id uuid REFERENCES public.transacoes(id) ON DELETE SET NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fatura_antecipacoes TO authenticated;

ALTER TABLE public.fatura_antecipacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fatura_antecipacoes_members_all" ON public.fatura_antecipacoes FOR ALL
  USING (private.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (private.is_workspace_member(workspace_id, auth.uid()));

CREATE INDEX idx_fatura_antecipacoes_fatura ON public.fatura_antecipacoes(fatura_id);
CREATE INDEX idx_fatura_antecipacoes_cartao ON public.fatura_antecipacoes(cartao_id);

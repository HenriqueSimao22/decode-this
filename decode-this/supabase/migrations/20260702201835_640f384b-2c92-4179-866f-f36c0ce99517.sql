
CREATE TABLE public.contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('pagar','receber')),
  descricao text NOT NULL,
  valor numeric(14,2) NOT NULL CHECK (valor >= 0),
  vencimento date NOT NULL,
  categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  observacao text,
  pago_em timestamptz,
  transacao_id uuid REFERENCES public.transacoes(id) ON DELETE SET NULL,
  recorrencia text NOT NULL DEFAULT 'nenhuma' CHECK (recorrencia IN ('nenhuma','semanal','mensal','anual')),
  grupo_recorrencia uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX contas_user_venc_idx ON public.contas (user_id, vencimento);
CREATE INDEX contas_grupo_idx ON public.contas (grupo_recorrencia) WHERE grupo_recorrencia IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas TO authenticated;
GRANT ALL ON public.contas TO service_role;

ALTER TABLE public.contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contas own all" ON public.contas
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER contas_set_updated_at
  BEFORE UPDATE ON public.contas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

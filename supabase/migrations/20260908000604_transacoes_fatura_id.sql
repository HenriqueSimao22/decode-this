-- Permite que uma transação (despesa) saiba de qual fatura de cartão ela veio.
-- Usado para dividir o pagamento/antecipação de fatura em várias despesas,
-- uma por categoria das compras que compõem a fatura (em vez de uma categoria só).
ALTER TABLE public.transacoes
  ADD COLUMN fatura_id uuid REFERENCES public.faturas(id) ON DELETE SET NULL;

CREATE INDEX idx_transacoes_fatura ON public.transacoes(fatura_id);

-- Vincula cada aporte/retirada de meta a uma transação real (receita/despesa),
-- pra que o saldo do mês, despesas e receitas na Visão Geral/Transações reflitam
-- automaticamente essas movimentações.
ALTER TABLE public.metas_aportes
  ADD COLUMN transacao_id uuid REFERENCES public.transacoes(id) ON DELETE SET NULL;


-- Novo tema "pergaminho" (o bege atual) + preserva usuários existentes
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_tema_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_tema_check
  CHECK (tema = ANY (ARRAY['claro'::text, 'pergaminho'::text, 'escuro'::text]));

-- Quem estava em "claro" (bege) migra para "pergaminho" para manter o visual
UPDATE public.profiles SET tema = 'pergaminho' WHERE tema = 'claro';

ALTER TABLE public.profiles ALTER COLUMN tema SET DEFAULT 'pergaminho';

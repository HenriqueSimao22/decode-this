CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============ WORKSPACES ============
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'individual' CHECK (tipo IN ('individual','conjunta')),
  criado_por uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  papel text NOT NULL DEFAULT 'membro' CHECK (papel IN ('dono','membro')),
  cor text NOT NULL DEFAULT '#6366f1',
  entrou_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.workspace_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email_convidado text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aceito','revogado','expirado')),
  criado_por uuid NOT NULL,
  aceito_por uuid,
  aceito_em timestamptz,
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_invites TO authenticated;
GRANT ALL ON public.workspace_invites TO service_role;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- Helpers (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = _workspace_id AND user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(_workspace_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = _workspace_id AND user_id = _user_id AND papel = 'dono')
$$;

-- Policies workspaces
CREATE POLICY "workspaces select members" ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_workspace_member(id, auth.uid()));
CREATE POLICY "workspaces insert self" ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (criado_por = auth.uid());
CREATE POLICY "workspaces update owner" ON public.workspaces FOR UPDATE TO authenticated
  USING (public.is_workspace_owner(id, auth.uid())) WITH CHECK (public.is_workspace_owner(id, auth.uid()));
CREATE POLICY "workspaces delete owner" ON public.workspaces FOR DELETE TO authenticated
  USING (public.is_workspace_owner(id, auth.uid()));

-- Policies members
CREATE POLICY "members select if member" ON public.workspace_members FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "members insert owner or self" ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_owner(workspace_id, auth.uid()) OR user_id = auth.uid());
CREATE POLICY "members update owner or self" ON public.workspace_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_owner(workspace_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_workspace_owner(workspace_id, auth.uid()));
CREATE POLICY "members delete owner or self" ON public.workspace_members FOR DELETE TO authenticated
  USING (public.is_workspace_owner(workspace_id, auth.uid()) OR user_id = auth.uid());

-- Policies invites
CREATE POLICY "invites select owner or invited" ON public.workspace_invites FOR SELECT TO authenticated
  USING (public.is_workspace_owner(workspace_id, auth.uid()) OR lower(email_convidado) = lower(coalesce((auth.jwt() ->> 'email'), '')));
CREATE POLICY "invites insert owner" ON public.workspace_invites FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_owner(workspace_id, auth.uid()) AND criado_por = auth.uid());
CREATE POLICY "invites update owner" ON public.workspace_invites FOR UPDATE TO authenticated
  USING (public.is_workspace_owner(workspace_id, auth.uid())) WITH CHECK (public.is_workspace_owner(workspace_id, auth.uid()));
CREATE POLICY "invites delete owner" ON public.workspace_invites FOR DELETE TO authenticated
  USING (public.is_workspace_owner(workspace_id, auth.uid()));

CREATE TRIGGER trg_workspaces_updated_at BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Profiles: workspace_ativo ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS workspace_ativo uuid;

-- ============ Add workspace_id/criado_por to existing tables ============
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS criado_por uuid;
ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS criado_por uuid;
ALTER TABLE public.contas ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.contas ADD COLUMN IF NOT EXISTS criado_por uuid;

-- ============ Backfill: individual workspace por usuário existente ============
DO $$
DECLARE u record; wid uuid;
BEGIN
  FOR u IN SELECT id FROM public.profiles LOOP
    SELECT w.id INTO wid FROM public.workspaces w
      JOIN public.workspace_members m ON m.workspace_id = w.id
      WHERE w.tipo = 'individual' AND w.criado_por = u.id AND m.user_id = u.id
      LIMIT 1;
    IF wid IS NULL THEN
      INSERT INTO public.workspaces (nome, tipo, criado_por) VALUES ('Minha carteira', 'individual', u.id) RETURNING id INTO wid;
      INSERT INTO public.workspace_members (workspace_id, user_id, papel, cor) VALUES (wid, u.id, 'dono', '#6366f1');
    END IF;
    UPDATE public.profiles SET workspace_ativo = COALESCE(workspace_ativo, wid) WHERE id = u.id;
    UPDATE public.categorias SET workspace_id = wid, criado_por = COALESCE(criado_por, u.id) WHERE user_id = u.id AND workspace_id IS NULL;
    UPDATE public.transacoes SET workspace_id = wid, criado_por = COALESCE(criado_por, u.id) WHERE user_id = u.id AND workspace_id IS NULL;
    UPDATE public.contas     SET workspace_id = wid, criado_por = COALESCE(criado_por, u.id) WHERE user_id = u.id AND workspace_id IS NULL;
  END LOOP;
END $$;

-- NOT NULL + FKs
ALTER TABLE public.categorias ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.transacoes ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.contas     ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.categorias ADD CONSTRAINT categorias_workspace_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.transacoes ADD CONSTRAINT transacoes_workspace_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.contas     ADD CONSTRAINT contas_workspace_fk     FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- ============ Substitui RLS antiga (user-based) por workspace-based ============
DROP POLICY IF EXISTS "categorias own all" ON public.categorias;
DROP POLICY IF EXISTS "transacoes own all" ON public.transacoes;
DROP POLICY IF EXISTS "contas own all" ON public.contas;

CREATE POLICY "categorias workspace members" ON public.categorias FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "transacoes workspace members" ON public.transacoes FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "contas workspace members" ON public.contas FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

-- ============ Atualiza trigger de novo usuário ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  _codigo text := NULLIF(NEW.raw_user_meta_data->>'codigo_acesso', '');
  _owner_email text := 'henriquesimao.eng@gmail.com';
  _code_row public.access_codes%ROWTYPE;
  _bloqueado boolean := false;
  _wid uuid;
  _nome text := COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1));
BEGIN
  IF lower(NEW.email) = lower(_owner_email) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSIF _codigo IS NOT NULL THEN
    SELECT * INTO _code_row FROM public.access_codes
      WHERE code = _codigo AND status = 'ativo' AND (expira_em IS NULL OR expira_em > now())
      FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Código de acesso inválido ou expirado'; END IF;
    UPDATE public.access_codes SET status='usado', usado_por=NEW.id, usado_em=now() WHERE id=_code_row.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  ELSE
    _bloqueado := true;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.workspaces (nome, tipo, criado_por) VALUES ('Minha carteira', 'individual', NEW.id) RETURNING id INTO _wid;
  INSERT INTO public.workspace_members (workspace_id, user_id, papel, cor) VALUES (_wid, NEW.id, 'dono', '#6366f1');

  INSERT INTO public.profiles (id, nome, email, codigo_usado, bloqueado, workspace_ativo)
  VALUES (NEW.id, _nome, NEW.email, _codigo, _bloqueado, _wid);

  INSERT INTO public.categorias (user_id, workspace_id, criado_por, nome, tipo, cor) VALUES
    (NEW.id, _wid, NEW.id, 'Salário',       'receita', '#4CAF50'),
    (NEW.id, _wid, NEW.id, 'Freelance',     'receita', '#8BC34A'),
    (NEW.id, _wid, NEW.id, 'Investimentos', 'receita', '#009688'),
    (NEW.id, _wid, NEW.id, 'Outros',        'receita', '#607D8B'),
    (NEW.id, _wid, NEW.id, 'Alimentação',   'despesa', '#F44336'),
    (NEW.id, _wid, NEW.id, 'Moradia',       'despesa', '#E91E63'),
    (NEW.id, _wid, NEW.id, 'Transporte',    'despesa', '#FF9800'),
    (NEW.id, _wid, NEW.id, 'Saúde',         'despesa', '#9C27B0'),
    (NEW.id, _wid, NEW.id, 'Educação',      'despesa', '#3F51B5'),
    (NEW.id, _wid, NEW.id, 'Lazer',         'despesa', '#00BCD4'),
    (NEW.id, _wid, NEW.id, 'Compras',       'despesa', '#795548'),
    (NEW.id, _wid, NEW.id, 'Contas',        'despesa', '#FF5722'),
    (NEW.id, _wid, NEW.id, 'Outros',        'despesa', '#607D8B');
  RETURN NEW;
END; $function$;

-- Helper para criar workspace conjunto com categorias
CREATE OR REPLACE FUNCTION public.seed_workspace_categories(_workspace_id uuid, _user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.categorias (user_id, workspace_id, criado_por, nome, tipo, cor) VALUES
    (_user_id, _workspace_id, _user_id, 'Salário',       'receita', '#4CAF50'),
    (_user_id, _workspace_id, _user_id, 'Freelance',     'receita', '#8BC34A'),
    (_user_id, _workspace_id, _user_id, 'Investimentos', 'receita', '#009688'),
    (_user_id, _workspace_id, _user_id, 'Outros',        'receita', '#607D8B'),
    (_user_id, _workspace_id, _user_id, 'Alimentação',   'despesa', '#F44336'),
    (_user_id, _workspace_id, _user_id, 'Moradia',       'despesa', '#E91E63'),
    (_user_id, _workspace_id, _user_id, 'Transporte',    'despesa', '#FF9800'),
    (_user_id, _workspace_id, _user_id, 'Saúde',         'despesa', '#9C27B0'),
    (_user_id, _workspace_id, _user_id, 'Educação',      'despesa', '#3F51B5'),
    (_user_id, _workspace_id, _user_id, 'Lazer',         'despesa', '#00BCD4'),
    (_user_id, _workspace_id, _user_id, 'Compras',       'despesa', '#795548'),
    (_user_id, _workspace_id, _user_id, 'Contas',        'despesa', '#FF5722'),
    (_user_id, _workspace_id, _user_id, 'Outros',        'despesa', '#607D8B');
END; $$;

-- ============================================================
-- Fase 3: avatar_url, fix RLS RETURNING, harden SECURITY DEFINER
-- ============================================================

-- 1) avatar_url em profiles + backfill
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

UPDATE public.profiles p
SET avatar_url = COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
FROM auth.users u
WHERE u.id = p.id
  AND p.avatar_url IS NULL
  AND COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture') IS NOT NULL;

-- 2) Schema privado para helpers de RLS
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION private.is_workspace_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = _workspace_id AND user_id = _user_id) $$;

CREATE OR REPLACE FUNCTION private.is_workspace_owner(_workspace_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = _workspace_id AND user_id = _user_id AND papel = 'dono') $$;

CREATE OR REPLACE FUNCTION private.seed_workspace_categories(_workspace_id uuid, _user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.categorias (user_id, workspace_id, criado_por, nome, tipo, cor) VALUES
    (_user_id,_workspace_id,_user_id,'Salário','receita','#4CAF50'),
    (_user_id,_workspace_id,_user_id,'Freelance','receita','#8BC34A'),
    (_user_id,_workspace_id,_user_id,'Investimentos','receita','#009688'),
    (_user_id,_workspace_id,_user_id,'Outros','receita','#607D8B'),
    (_user_id,_workspace_id,_user_id,'Alimentação','despesa','#F44336'),
    (_user_id,_workspace_id,_user_id,'Moradia','despesa','#E91E63'),
    (_user_id,_workspace_id,_user_id,'Transporte','despesa','#FF9800'),
    (_user_id,_workspace_id,_user_id,'Saúde','despesa','#9C27B0'),
    (_user_id,_workspace_id,_user_id,'Educação','despesa','#3F51B5'),
    (_user_id,_workspace_id,_user_id,'Lazer','despesa','#00BCD4'),
    (_user_id,_workspace_id,_user_id,'Compras','despesa','#795548'),
    (_user_id,_workspace_id,_user_id,'Contas','despesa','#FF5722'),
    (_user_id,_workspace_id,_user_id,'Outros','despesa','#607D8B');
END; $$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_workspace_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_workspace_owner(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.seed_workspace_categories(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_workspace_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_workspace_owner(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.seed_workspace_categories(uuid, uuid) TO authenticated, service_role;

-- 3) Recriar todas as policies para referenciar private.*
DROP POLICY IF EXISTS "admins manage access_codes" ON public.access_codes;
DROP POLICY IF EXISTS "categorias workspace members" ON public.categorias;
DROP POLICY IF EXISTS "contas workspace members" ON public.contas;
DROP POLICY IF EXISTS "admins read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "transacoes workspace members" ON public.transacoes;
DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "invites delete owner" ON public.workspace_invites;
DROP POLICY IF EXISTS "invites insert owner" ON public.workspace_invites;
DROP POLICY IF EXISTS "invites select owner or invited" ON public.workspace_invites;
DROP POLICY IF EXISTS "invites update owner" ON public.workspace_invites;
DROP POLICY IF EXISTS "members delete owner or self" ON public.workspace_members;
DROP POLICY IF EXISTS "members insert owner or self" ON public.workspace_members;
DROP POLICY IF EXISTS "members select if member" ON public.workspace_members;
DROP POLICY IF EXISTS "members update owner or self" ON public.workspace_members;
DROP POLICY IF EXISTS "workspaces delete owner" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces select members" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces update owner" ON public.workspaces;

CREATE POLICY "admins manage access_codes" ON public.access_codes FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

CREATE POLICY "categorias workspace members" ON public.categorias FOR ALL TO authenticated
  USING (private.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (private.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "contas workspace members" ON public.contas FOR ALL TO authenticated
  USING (private.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (private.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "transacoes workspace members" ON public.transacoes FOR ALL TO authenticated
  USING (private.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (private.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "admins read all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin'));

CREATE POLICY "admins update all profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'));

-- workspaces: SELECT também permite ao criador (fix do RETURNING no INSERT)
CREATE POLICY "workspaces select members" ON public.workspaces FOR SELECT TO authenticated
  USING (private.is_workspace_member(id, auth.uid()) OR criado_por = auth.uid());
CREATE POLICY "workspaces update owner" ON public.workspaces FOR UPDATE TO authenticated
  USING (private.is_workspace_owner(id, auth.uid())) WITH CHECK (private.is_workspace_owner(id, auth.uid()));
CREATE POLICY "workspaces delete owner" ON public.workspaces FOR DELETE TO authenticated
  USING (private.is_workspace_owner(id, auth.uid()));

CREATE POLICY "members select if member" ON public.workspace_members FOR SELECT TO authenticated
  USING (private.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "members insert owner or self" ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (private.is_workspace_owner(workspace_id, auth.uid()) OR user_id = auth.uid());
CREATE POLICY "members update owner or self" ON public.workspace_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR private.is_workspace_owner(workspace_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR private.is_workspace_owner(workspace_id, auth.uid()));
CREATE POLICY "members delete owner or self" ON public.workspace_members FOR DELETE TO authenticated
  USING (private.is_workspace_owner(workspace_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "invites select owner or invited" ON public.workspace_invites FOR SELECT TO authenticated
  USING (private.is_workspace_owner(workspace_id, auth.uid()) OR lower(email_convidado) = lower(COALESCE(auth.jwt()->>'email', '')));
CREATE POLICY "invites insert owner" ON public.workspace_invites FOR INSERT TO authenticated
  WITH CHECK (private.is_workspace_owner(workspace_id, auth.uid()) AND criado_por = auth.uid());
CREATE POLICY "invites update owner" ON public.workspace_invites FOR UPDATE TO authenticated
  USING (private.is_workspace_owner(workspace_id, auth.uid())) WITH CHECK (private.is_workspace_owner(workspace_id, auth.uid()));
CREATE POLICY "invites delete owner" ON public.workspace_invites FOR DELETE TO authenticated
  USING (private.is_workspace_owner(workspace_id, auth.uid()));

-- 4) Atualizar handle_new_user para usar private.seed_workspace_categories e salvar avatar_url
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _codigo text := NULLIF(NEW.raw_user_meta_data->>'codigo_acesso', '');
  _owner_email text := 'henriquesimao.eng@gmail.com';
  _code_row public.access_codes%ROWTYPE;
  _bloqueado boolean := false;
  _wid uuid;
  _nome text := COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1));
  _avatar text := COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture');
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

  INSERT INTO public.profiles (id, nome, email, avatar_url, codigo_usado, bloqueado, workspace_ativo)
  VALUES (NEW.id, _nome, NEW.email, _avatar, _codigo, _bloqueado, _wid);

  PERFORM private.seed_workspace_categories(_wid, NEW.id);
  RETURN NEW;
END; $$;

-- 5) Descartar funções antigas em public
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_workspace_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_workspace_owner(uuid, uuid);
DROP FUNCTION IF EXISTS public.seed_workspace_categories(uuid, uuid);

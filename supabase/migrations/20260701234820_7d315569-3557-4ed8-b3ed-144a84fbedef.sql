-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Access codes
CREATE TABLE public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','usado','revogado')),
  notas text,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  usado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  usado_em timestamptz,
  expira_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.access_codes TO authenticated;
GRANT ALL ON public.access_codes TO service_role;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage access_codes" ON public.access_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles: add bloqueado + email cache + código usado
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bloqueado boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS codigo_usado text;

CREATE POLICY "admins read all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update all profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update handle_new_user: consume code, set email, auto-admin for owner email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _codigo text := NULLIF(NEW.raw_user_meta_data->>'codigo_acesso', '');
  _owner_email text := 'henriquesimao.eng@gmail.com';
  _code_row public.access_codes%ROWTYPE;
BEGIN
  -- Owner bypass: sempre admin, sem exigir código
  IF lower(NEW.email) = lower(_owner_email) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT DO NOTHING;
  ELSE
    -- Exige código válido
    IF _codigo IS NULL THEN
      RAISE EXCEPTION 'Código de acesso obrigatório';
    END IF;
    SELECT * INTO _code_row FROM public.access_codes
      WHERE code = _codigo AND status = 'ativo'
      AND (expira_em IS NULL OR expira_em > now())
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Código de acesso inválido ou expirado';
    END IF;
    UPDATE public.access_codes
      SET status = 'usado', usado_por = NEW.id, usado_em = now()
      WHERE id = _code_row.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
      ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.profiles (id, nome, email, codigo_usado)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    _codigo
  );

  INSERT INTO public.categorias (user_id, nome, tipo, cor) VALUES
    (NEW.id, 'Salário',       'receita', '#4CAF50'),
    (NEW.id, 'Freelance',     'receita', '#8BC34A'),
    (NEW.id, 'Investimentos', 'receita', '#009688'),
    (NEW.id, 'Outros',        'receita', '#607D8B'),
    (NEW.id, 'Alimentação',   'despesa', '#F44336'),
    (NEW.id, 'Moradia',       'despesa', '#E91E63'),
    (NEW.id, 'Transporte',    'despesa', '#FF9800'),
    (NEW.id, 'Saúde',         'despesa', '#9C27B0'),
    (NEW.id, 'Educação',      'despesa', '#3F51B5'),
    (NEW.id, 'Lazer',         'despesa', '#00BCD4'),
    (NEW.id, 'Compras',       'despesa', '#795548'),
    (NEW.id, 'Contas',        'despesa', '#FF5722'),
    (NEW.id, 'Outros',        'despesa', '#607D8B');
  RETURN NEW;
END; $$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Se o owner já existe, promova
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE lower(email) = 'henriquesimao.eng@gmail.com'
ON CONFLICT DO NOTHING;

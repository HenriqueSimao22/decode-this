CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _codigo text := NULLIF(NEW.raw_user_meta_data->>'codigo_acesso', '');
  _owner_email text := 'henriquesimao.eng@gmail.com';
  _code_row public.access_codes%ROWTYPE;
  _bloqueado boolean := false;
BEGIN
  IF lower(NEW.email) = lower(_owner_email) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSIF _codigo IS NOT NULL THEN
    SELECT * INTO _code_row FROM public.access_codes
      WHERE code = _codigo AND status = 'ativo'
      AND (expira_em IS NULL OR expira_em > now())
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Código de acesso inválido ou expirado';
    END IF;
    UPDATE public.access_codes SET status='usado', usado_por=NEW.id, usado_em=now() WHERE id=_code_row.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  ELSE
    -- Sem código (ex.: primeiro login via Google): entra bloqueado, admin libera pelo painel
    _bloqueado := true;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.profiles (id, nome, email, codigo_usado, bloqueado)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    _codigo,
    _bloqueado
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
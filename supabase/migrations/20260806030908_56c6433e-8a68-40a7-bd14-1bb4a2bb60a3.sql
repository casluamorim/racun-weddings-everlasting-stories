CREATE TABLE public.auth_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope text NOT NULL,
  identifier text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_attempts_lookup ON public.auth_attempts (scope, identifier, created_at DESC);

GRANT ALL ON public.auth_attempts TO service_role;

ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

-- No policies: table is only reachable through SECURITY DEFINER functions below.

CREATE OR REPLACE FUNCTION public.throttle_check(_scope text, _identifier text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _max_attempts constant int := 5;
  _window constant interval := interval '15 minutes';
  _cnt int;
  _last timestamptz;
BEGIN
  IF _identifier IS NULL OR length(_identifier) = 0 OR length(_identifier) > 200 THEN
    RETURN 0;
  END IF;

  DELETE FROM public.auth_attempts WHERE created_at < now() - interval '24 hours';

  SELECT count(*), max(created_at) INTO _cnt, _last
  FROM public.auth_attempts
  WHERE scope = _scope AND identifier = lower(_identifier)
    AND created_at > now() - _window;

  IF _cnt >= _max_attempts THEN
    RETURN GREATEST(1, CEIL(EXTRACT(EPOCH FROM ((_last + _window) - now())))::int);
  END IF;

  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.throttle_record_failure(_scope text, _identifier text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _identifier IS NULL OR length(_identifier) = 0 OR length(_identifier) > 200 THEN
    RETURN 0;
  END IF;
  IF _scope NOT IN ('gallery_password', 'admin_login') THEN
    RETURN 0;
  END IF;

  INSERT INTO public.auth_attempts (scope, identifier)
  VALUES (_scope, lower(_identifier));

  RETURN public.throttle_check(_scope, _identifier);
END;
$$;

CREATE OR REPLACE FUNCTION public.throttle_clear(_scope text, _identifier text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _scope NOT IN ('gallery_password', 'admin_login') OR _identifier IS NULL THEN
    RETURN;
  END IF;
  DELETE FROM public.auth_attempts
  WHERE scope = _scope AND identifier = lower(_identifier);
END;
$$;

REVOKE ALL ON FUNCTION public.throttle_check(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.throttle_record_failure(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.throttle_clear(text, text) FROM PUBLIC;

-- Login throttling helpers used by the admin login screen (unauthenticated callers).
CREATE OR REPLACE FUNCTION public.login_throttle_status(_email text)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.throttle_check('admin_login', _email);
$$;

CREATE OR REPLACE FUNCTION public.login_throttle_fail(_email text)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.throttle_record_failure('admin_login', _email);
$$;

CREATE OR REPLACE FUNCTION public.login_throttle_reset(_email text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.throttle_clear('admin_login', _email);
$$;

REVOKE ALL ON FUNCTION public.login_throttle_status(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.login_throttle_fail(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.login_throttle_reset(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_throttle_status(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_throttle_fail(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_throttle_reset(text) TO anon, authenticated;

-- Gallery password verification now enforces lockouts.
CREATE OR REPLACE FUNCTION public.verify_gallery_password(_slug text, _password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  g record;
  new_token text;
  locked int;
BEGIN
  IF _slug IS NULL OR _password IS NULL OR length(_password) > 128 THEN
    RETURN NULL;
  END IF;

  locked := public.throttle_check('gallery_password', _slug);
  IF locked > 0 THEN
    RAISE EXCEPTION 'locked_out:%', locked;
  END IF;

  SELECT id, password_hash, is_password_protected
  INTO g
  FROM public.wedding_galleries
  WHERE slug = _slug AND is_published = true
  LIMIT 1;

  IF g.id IS NULL OR NOT g.is_password_protected OR g.password_hash IS NULL THEN
    RETURN NULL;
  END IF;

  IF extensions.crypt(_password, g.password_hash) <> g.password_hash THEN
    locked := public.throttle_record_failure('gallery_password', _slug);
    IF locked > 0 THEN
      RAISE EXCEPTION 'locked_out:%', locked;
    END IF;
    RETURN NULL;
  END IF;

  PERFORM public.throttle_clear('gallery_password', _slug);

  DELETE FROM public.gallery_access_sessions WHERE expires_at < now();

  new_token := encode(extensions.gen_random_bytes(24), 'hex');
  INSERT INTO public.gallery_access_sessions (token, gallery_id)
  VALUES (new_token, g.id);

  RETURN new_token;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_gallery_password(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_gallery_password(text, text) TO anon, authenticated;
CREATE TABLE public.auth_unlock_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope text NOT NULL,
  identifier text NOT NULL,
  unlocked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.auth_unlock_log TO authenticated;
GRANT ALL ON public.auth_unlock_log TO service_role;

ALTER TABLE public.auth_unlock_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view unlock log"
ON public.auth_unlock_log
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.admin_list_auth_attempts(_limit integer DEFAULT 200)
RETURNS TABLE(scope text, identifier text, attempts integer, recent_attempts integer, last_attempt timestamp with time zone, locked_seconds integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT a.scope,
         a.identifier,
         count(*)::int AS attempts,
         count(*) FILTER (WHERE a.created_at > now() - interval '15 minutes')::int AS recent_attempts,
         max(a.created_at) AS last_attempt,
         CASE
           WHEN count(*) FILTER (WHERE a.created_at > now() - interval '15 minutes') >= 5
           THEN GREATEST(1, CEIL(EXTRACT(EPOCH FROM ((max(a.created_at) + interval '15 minutes') - now())))::int)
           ELSE 0
         END AS locked_seconds
  FROM public.auth_attempts a
  GROUP BY a.scope, a.identifier
  ORDER BY max(a.created_at) DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 200), 1), 500);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_unlock_log(_limit integer DEFAULT 100)
RETURNS TABLE(id uuid, scope text, identifier text, unlocked_by uuid, created_at timestamp with time zone)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT l.id, l.scope, l.identifier, l.unlocked_by, l.created_at
  FROM public.auth_unlock_log l
  ORDER BY l.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 100), 1), 500);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_clear_lockout(_scope text, _identifier text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF _scope NOT IN ('gallery_password', 'admin_login') THEN
    RAISE EXCEPTION 'invalid_scope';
  END IF;

  IF _identifier IS NULL OR length(_identifier) = 0 OR length(_identifier) > 200 THEN
    RAISE EXCEPTION 'invalid_identifier';
  END IF;

  DELETE FROM public.auth_attempts
  WHERE scope = _scope AND identifier = lower(_identifier);

  INSERT INTO public.auth_unlock_log (scope, identifier, unlocked_by)
  VALUES (_scope, lower(_identifier), auth.uid());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_auth_attempts(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_unlock_log(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_clear_lockout(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_list_auth_attempts(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_unlock_log(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_clear_lockout(text, text) TO authenticated;
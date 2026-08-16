CREATE TABLE public.email_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  message_id TEXT,
  to_email TEXT,
  from_email TEXT,
  subject TEXT,
  occurred_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.email_events TO authenticated;
GRANT ALL ON public.email_events TO service_role;

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email events"
ON public.email_events FOR SELECT TO authenticated
USING (public.is_admin());

CREATE INDEX email_events_created_at_idx ON public.email_events (created_at DESC);
CREATE INDEX email_events_message_id_idx ON public.email_events (message_id);
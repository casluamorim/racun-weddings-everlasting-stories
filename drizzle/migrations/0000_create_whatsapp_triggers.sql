CREATE TABLE public.whatsapp_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  to_email text,
  to_phone text,
  event_type text NOT NULL,
  message text NOT NULL,
  wa_link text,
  status text NOT NULL DEFAULT 'pending',
  provider text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.whatsapp_triggers TO authenticated;
GRANT ALL ON public.whatsapp_triggers TO service_role;

ALTER TABLE public.whatsapp_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view whatsapp triggers"
ON public.whatsapp_triggers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_whatsapp_triggers_created_at ON public.whatsapp_triggers (created_at DESC);
CREATE INDEX idx_whatsapp_triggers_dedupe ON public.whatsapp_triggers (to_email, event_type, created_at DESC);
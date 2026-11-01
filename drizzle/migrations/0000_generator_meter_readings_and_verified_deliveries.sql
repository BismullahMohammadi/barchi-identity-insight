-- Generator diesel model: append-only, owner-only. Baseline (1405/06/31 = 2026-09-22, 497 L, meter 5113 h, 3.5 L/h) is a fixed historical checkpoint.
CREATE TABLE public.generator_meter_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  reading_at timestamptz NOT NULL,
  meter_hours numeric(12,2) NOT NULL CHECK (meter_hours >= 5113 AND meter_hours <= 1000000),
  rate_lph numeric(8,3) NOT NULL CHECK (rate_lph > 0 AND rate_lph <= 100),
  measured_liters numeric(12,2) CHECK (measured_liters IS NULL OR (measured_liters >= 0 AND measured_liters <= 100000)),
  note text CHECK (note IS NULL OR length(note) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX generator_meter_readings_owner_time ON public.generator_meter_readings(user_id, reading_at);
COMMENT ON COLUMN public.generator_meter_readings.rate_lph IS 'Liters per hour applicable to the interval ending at this reading';

CREATE TABLE public.generator_diesel_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  delivered_at timestamptz NOT NULL,
  liters numeric(12,2) NOT NULL CHECK (liters > 0 AND liters <= 100000),
  reference_no text NOT NULL CHECK (length(trim(reference_no)) BETWEEN 1 AND 120),
  supplier text CHECK (supplier IS NULL OR length(supplier) <= 180),
  note text CHECK (note IS NULL OR length(note) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX generator_diesel_deliveries_owner_time ON public.generator_diesel_deliveries(user_id, delivered_at);
COMMENT ON TABLE public.generator_diesel_deliveries IS 'Only separately confirmed deliveries after the 1405/06/31 baseline; independent of fuel_entries and the Google Sheet';

GRANT SELECT, INSERT ON public.generator_meter_readings TO authenticated;
GRANT SELECT, INSERT ON public.generator_diesel_deliveries TO authenticated;
GRANT ALL ON public.generator_meter_readings TO service_role;
GRANT ALL ON public.generator_diesel_deliveries TO service_role;
REVOKE ALL ON public.generator_meter_readings FROM anon;
REVOKE ALL ON public.generator_diesel_deliveries FROM anon;

ALTER TABLE public.generator_meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generator_diesel_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY generator_readings_owner_select ON public.generator_meter_readings FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY generator_readings_owner_insert ON public.generator_meter_readings FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY generator_deliveries_owner_select ON public.generator_diesel_deliveries FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY generator_deliveries_owner_insert ON public.generator_diesel_deliveries FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

-- Chronological + monotonic validation (serialized per owner).
CREATE OR REPLACE FUNCTION public.validate_generator_reading()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_last_at timestamptz; v_last_hours numeric;
BEGIN
  NEW.created_at := now();
  IF NEW.reading_at <= timestamptz '2026-09-22 00:00:00+04:30' THEN RAISE EXCEPTION 'READING_BEFORE_BASELINE'; END IF;
  IF NEW.reading_at > now() + interval '10 minutes' THEN RAISE EXCEPTION 'READING_IN_FUTURE'; END IF;
  IF NEW.meter_hours < 5113 THEN RAISE EXCEPTION 'METER_BELOW_BASELINE'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text), 51130);
  SELECT reading_at, meter_hours INTO v_last_at, v_last_hours FROM public.generator_meter_readings
   WHERE user_id = NEW.user_id ORDER BY reading_at DESC LIMIT 1;
  IF v_last_at IS NOT NULL THEN
    IF NEW.reading_at <= v_last_at THEN RAISE EXCEPTION 'READING_NOT_CHRONOLOGICAL'; END IF;
    IF NEW.meter_hours < v_last_hours THEN RAISE EXCEPTION 'METER_NOT_MONOTONIC'; END IF;
  END IF;
  NEW.note := left(nullif(trim(NEW.note), ''), 2000);
  RETURN NEW;
END;$$;
CREATE TRIGGER generator_reading_validate BEFORE INSERT ON public.generator_meter_readings
FOR EACH ROW EXECUTE FUNCTION public.validate_generator_reading();

CREATE OR REPLACE FUNCTION public.validate_generator_delivery()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.created_at := now();
  IF NEW.delivered_at <= timestamptz '2026-09-22 00:00:00+04:30' THEN RAISE EXCEPTION 'DELIVERY_BEFORE_BASELINE'; END IF;
  IF NEW.delivered_at > now() + interval '10 minutes' THEN RAISE EXCEPTION 'DELIVERY_IN_FUTURE'; END IF;
  NEW.reference_no := trim(NEW.reference_no);
  NEW.note := left(nullif(trim(NEW.note), ''), 2000);
  NEW.supplier := left(nullif(trim(NEW.supplier), ''), 180);
  RETURN NEW;
END;$$;
CREATE TRIGGER generator_delivery_validate BEFORE INSERT ON public.generator_diesel_deliveries
FOR EACH ROW EXECUTE FUNCTION public.validate_generator_delivery();

-- Append-only audit: block any update/delete, even for privileged roles.
CREATE OR REPLACE FUNCTION public.block_generator_audit_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'APPEND_ONLY'; END;$$;
CREATE TRIGGER generator_readings_append_only BEFORE UPDATE OR DELETE ON public.generator_meter_readings
FOR EACH ROW EXECUTE FUNCTION public.block_generator_audit_change();
CREATE TRIGGER generator_deliveries_append_only BEFORE UPDATE OR DELETE ON public.generator_diesel_deliveries
FOR EACH ROW EXECUTE FUNCTION public.block_generator_audit_change();
REVOKE ALL ON FUNCTION public.validate_generator_reading() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_generator_delivery() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.block_generator_audit_change() FROM public, anon, authenticated;
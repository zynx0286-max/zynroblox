-- Add CCU and visits columns to works table
ALTER TABLE public.works
ADD COLUMN ccu INTEGER NOT NULL DEFAULT 0,
ADD COLUMN visits INTEGER NOT NULL DEFAULT 0;

-- Create trigger to update works updated_at when ccu/visits change
CREATE OR REPLACE FUNCTION public.update_works_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_works_timestamp ON public.works;
CREATE TRIGGER update_works_timestamp
BEFORE UPDATE ON public.works
FOR EACH ROW
EXECUTE FUNCTION public.update_works_timestamp();

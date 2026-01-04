
-- Update employees table to include password column
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS password TEXT;

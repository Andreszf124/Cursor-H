-- ============================================================
-- 001: Extensiones y utilidades base
-- Idempotente — puede aplicarse múltiples veces sin efectos.
-- Ref: docs/DATABASE.md §1, §6
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- Trigger genérico para mantener updated_at (docs/DATABASE.md §6)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

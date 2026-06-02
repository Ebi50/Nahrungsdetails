-- Fix: Der partielle Unique-Index (WHERE owner_id is null) kann von PostgREST
-- nicht als ON-CONFLICT-Ziel genutzt werden -> Cache-Upsert schlug fehl, externe
-- Treffer wurden nie gespeichert -> Suche lieferte 0 Ergebnisse ohne Fehlermeldung.
--
-- Lösung: echte Unique-Constraint auf (source, source_ref). NULL-source_ref
-- (custom/mix) kollidieren nicht, da NULLs in Unique-Constraints als verschieden
-- gelten. usda/off haben immer eine source_ref.

drop index if exists public.foods_source_ref_uniq;

alter table public.foods
  drop constraint if exists foods_source_ref_uniq;
alter table public.foods
  add constraint foods_source_ref_uniq unique (source, source_ref);

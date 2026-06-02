-- DGE/D-A-CH-Referenzwerte (Mikros), Erwachsene 19–65 (Abschnitt 7).
-- Erweiterbar um weitere Alters-/Sondergruppen (Schwangerschaft etc.).
-- 'any' = für beide Geschlechter identisch.
-- Idempotent: vorhandene Werte dieser Gruppe vor dem Insert entfernen.

delete from public.reference_values where age_min = 19 and age_max = 200;

insert into public.reference_values (sex, age_min, age_max, nutrient_key, value, unit) values
  -- gleich für beide Geschlechter
  ('any', 19, 200, 'vitD',      20,   'µg'),
  ('any', 19, 200, 'b12',       4.0,  'µg'),
  ('any', 19, 200, 'folate',    300,  'µg'),
  ('any', 19, 200, 'calcium',   1000, 'mg'),
  ('any', 19, 200, 'potassium', 4000, 'mg'),
  ('any', 19, 200, 'sodium',    1500, 'mg'),
  ('any', 19, 200, 'fiber',     30,   'g'),
  -- geschlechtsspezifisch (♂)
  ('m', 19, 200, 'vitC',      110, 'mg'),
  ('m', 19, 200, 'iron',      10,  'mg'),
  ('m', 19, 200, 'magnesium', 350, 'mg'),
  ('m', 19, 200, 'zinc',      11,  'mg'),
  -- geschlechtsspezifisch (♀)
  ('f', 19, 200, 'vitC',      95,  'mg'),
  ('f', 19, 200, 'iron',      15,  'mg'),
  ('f', 19, 200, 'magnesium', 300, 'mg'),
  ('f', 19, 200, 'zinc',      7,   'mg');

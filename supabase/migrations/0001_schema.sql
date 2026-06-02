-- Nährstoff-Bilanz — Datenmodell (Abschnitt 3 des Konzepts)
-- Alles kanonisch je 100 g; Portionen werden erst bei der Berechnung skaliert.

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- profiles: Eingaben für die Soll-Berechnung. user_id = auth.users(id).
-- (users-Tabelle wird durch Supabase Auth bereitgestellt.)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  sex            text not null check (sex in ('m','f')),
  age            int  not null check (age between 0 and 120),
  weight_kg      numeric(5,1) not null check (weight_kg > 0),
  height_cm      numeric(5,1) not null check (height_cm > 0),
  pal            numeric(3,2) not null default 1.4 check (pal between 1.0 and 2.5),
  goal_kcal      int not null default 0,
  protein_per_kg numeric(3,1) not null default 0.8 check (protein_per_kg >= 0.8),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- foods: gecachte (usda/off) + eigene (custom/mix) Lebensmittel.
-- owner_id null  => global geteilter Cache (USDA/OFF).
-- owner_id gesetzt => privates Lebensmittel/Mischung des Nutzers.
-- per_100g: JSON nach kanonischem Nährstoff-Schema (Abschnitt 5).
-- ---------------------------------------------------------------------------
create table if not exists public.foods (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references auth.users(id) on delete cascade,
  source     text not null check (source in ('usda','off','custom','mix')),
  source_ref text,
  name       text not null,
  brand      text,
  per_100g   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
-- Cache-Treffer: gleiche Quelle + Referenz nur einmal global speichern.
create unique index if not exists foods_source_ref_uniq
  on public.foods (source, source_ref)
  where owner_id is null and source_ref is not null;
create index if not exists foods_owner_idx on public.foods (owner_id);
create index if not exists foods_name_trgm  on public.foods using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- mixtures + mixture_items: Rezepte. Jede Mischung verweist auf eine
-- foods-Zeile mit source='mix' (food_ref), die die aggregierten per_100g hält.
-- ---------------------------------------------------------------------------
create table if not exists public.mixtures (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  food_ref    uuid references public.foods(id) on delete set null,
  name        text not null,
  total_grams numeric(8,1) not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists mixtures_user_idx on public.mixtures (user_id);

create table if not exists public.mixture_items (
  id         uuid primary key default gen_random_uuid(),
  mixture_id uuid not null references public.mixtures(id) on delete cascade,
  food_id    uuid not null references public.foods(id) on delete restrict,
  grams      numeric(8,1) not null check (grams > 0)
);
create index if not exists mixture_items_mix_idx on public.mixture_items (mixture_id);

-- ---------------------------------------------------------------------------
-- diary_entries: Tagebuch (Ist-Zufuhr).
-- ---------------------------------------------------------------------------
create table if not exists public.diary_entries (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date    date not null,
  food_id uuid not null references public.foods(id) on delete restrict,
  grams   numeric(8,1) not null check (grams > 0)
);
create index if not exists diary_user_date_idx on public.diary_entries (user_id, date);

-- ---------------------------------------------------------------------------
-- activity_entries: verbrannte Energie pro Tag (manuell/Strava).
-- ---------------------------------------------------------------------------
create table if not exists public.activity_entries (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date    date not null,
  kcal    int not null check (kcal >= 0),
  source  text not null default 'manual' check (source in ('manual','strava')),
  meta    jsonb not null default '{}'::jsonb
);
create index if not exists activity_user_date_idx on public.activity_entries (user_id, date);

-- ---------------------------------------------------------------------------
-- oauth_tokens: z. B. Strava-Anbindung. Nur serverseitig (service role) lesbar.
-- ---------------------------------------------------------------------------
create table if not exists public.oauth_tokens (
  user_id      uuid not null references auth.users(id) on delete cascade,
  provider     text not null,
  access_token text not null,
  refresh_token text,
  expires_at   timestamptz,
  primary key (user_id, provider)
);

-- ---------------------------------------------------------------------------
-- reference_values: DGE/D-A-CH-Sollwerte (Mikros) nach Geschlecht/Alter.
-- Öffentlich lesbar (Konfigurationstabelle), nur Admin schreibt.
-- ---------------------------------------------------------------------------
create table if not exists public.reference_values (
  id           uuid primary key default gen_random_uuid(),
  sex          text not null check (sex in ('m','f','any')),
  age_min      int  not null default 0,
  age_max      int  not null default 200,
  nutrient_key text not null,
  value        numeric not null,
  unit         text not null
);
create index if not exists refval_lookup_idx
  on public.reference_values (nutrient_key, sex, age_min, age_max);

-- Row Level Security: Nutzer sehen nur eigene Daten.
-- Globaler Foods-Cache (owner_id is null) und reference_values sind lesbar für alle.
-- Idempotent: 'drop policy if exists' erlaubt gefahrloses erneutes Ausführen.

alter table public.profiles         enable row level security;
alter table public.foods            enable row level security;
alter table public.mixtures         enable row level security;
alter table public.mixture_items    enable row level security;
alter table public.diary_entries    enable row level security;
alter table public.activity_entries enable row level security;
alter table public.oauth_tokens     enable row level security;
alter table public.reference_values enable row level security;

-- profiles -------------------------------------------------------------------
drop policy if exists "profiles own select" on public.profiles;
create policy "profiles own select" on public.profiles
  for select using (auth.uid() = user_id);
drop policy if exists "profiles own upsert" on public.profiles;
create policy "profiles own upsert" on public.profiles
  for insert with check (auth.uid() = user_id);
drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- foods: globaler Cache lesbar; eigene custom/mix schreib-/lesbar ------------
drop policy if exists "foods read shared or own" on public.foods;
create policy "foods read shared or own" on public.foods
  for select using (owner_id is null or owner_id = auth.uid());
drop policy if exists "foods insert own or cache" on public.foods;
create policy "foods insert own or cache" on public.foods
  for insert with check (owner_id = auth.uid() or owner_id is null);
drop policy if exists "foods update own" on public.foods;
create policy "foods update own" on public.foods
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "foods delete own" on public.foods;
create policy "foods delete own" on public.foods
  for delete using (owner_id = auth.uid());

-- mixtures -------------------------------------------------------------------
drop policy if exists "mixtures own all" on public.mixtures;
create policy "mixtures own all" on public.mixtures
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- mixture_items: über zugehörige mixture geprüft -----------------------------
drop policy if exists "mixture_items own all" on public.mixture_items;
create policy "mixture_items own all" on public.mixture_items
  for all using (
    exists (select 1 from public.mixtures m
            where m.id = mixture_id and m.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.mixtures m
            where m.id = mixture_id and m.user_id = auth.uid())
  );

-- diary_entries --------------------------------------------------------------
drop policy if exists "diary own all" on public.diary_entries;
create policy "diary own all" on public.diary_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- activity_entries -----------------------------------------------------------
drop policy if exists "activity own all" on public.activity_entries;
create policy "activity own all" on public.activity_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- oauth_tokens: kein Client-Zugriff; nur service_role (umgeht RLS) -----------
-- (Bewusst keine Policy -> mit aktivem RLS sind Tokens für anon/authenticated
--  unsichtbar. Zugriff ausschließlich serverseitig über den Service-Key.)

-- reference_values: für alle lesbar -----------------------------------------
drop policy if exists "refval read all" on public.reference_values;
create policy "refval read all" on public.reference_values
  for select using (true);

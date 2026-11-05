-- Per-user checklist.
--
-- The live tables already hold rows with no owner (items and one week target;
-- day logs are included so that table can gain a non-null user_id too).
-- Those rows are copied into holding tables and removed before user_id is
-- added NOT NULL. A nullable user_id would leave ownerless rows in the live
-- tables under the new key. Copying first keeps them recoverable, and the
-- live tables never contain an ownerless row once the new primary keys exist.
-- Holding tables have RLS on and no policies, so the API cannot read them.
-- claim_legacy_checklist() is the only way back, and only for one email.

create table if not exists public.checklist_legacy_items (
  id text primary key,
  label text not null,
  category text not null,
  sort_order integer not null,
  active boolean not null,
  public_streak boolean not null,
  note text,
  tags text[] not null default '{}',
  track text
);

create table if not exists public.checklist_legacy_day_logs (
  day date primary key,
  checks jsonb not null,
  spend numeric,
  note text
);

create table if not exists public.checklist_legacy_week_targets (
  week_start date primary key,
  targets jsonb not null,
  sunday_review text
);

alter table public.checklist_legacy_items enable row level security;
alter table public.checklist_legacy_day_logs enable row level security;
alter table public.checklist_legacy_week_targets enable row level security;

revoke all on table public.checklist_legacy_items from public, anon, authenticated;
revoke all on table public.checklist_legacy_day_logs from public, anon, authenticated;
revoke all on table public.checklist_legacy_week_targets from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'checklist_items' and column_name = 'user_id'
  ) then
    insert into public.checklist_legacy_items (id, label, category, sort_order, active, public_streak, note, tags, track)
    select id, label, category, sort_order, active, public_streak, note, tags, track
    from public.checklist_items
    on conflict (id) do nothing;
    delete from public.checklist_items;

    insert into public.checklist_legacy_day_logs (day, checks, spend, note)
    select day, checks, spend, note
    from public.checklist_day_logs
    on conflict (day) do nothing;
    delete from public.checklist_day_logs;

    insert into public.checklist_legacy_week_targets (week_start, targets, sunday_review)
    select week_start, targets, sunday_review
    from public.checklist_week_targets
    on conflict (week_start) do nothing;
    delete from public.checklist_week_targets;

    alter table public.checklist_items
      add column user_id uuid not null references auth.users (id) on delete cascade;
    alter table public.checklist_items drop constraint checklist_items_pkey;
    alter table public.checklist_items add primary key (user_id, id);

    alter table public.checklist_day_logs
      add column user_id uuid not null references auth.users (id) on delete cascade;
    alter table public.checklist_day_logs drop constraint checklist_day_logs_pkey;
    alter table public.checklist_day_logs add primary key (user_id, day);

    alter table public.checklist_week_targets
      add column user_id uuid not null references auth.users (id) on delete cascade;
    alter table public.checklist_week_targets drop constraint checklist_week_targets_pkey;
    alter table public.checklist_week_targets add primary key (user_id, week_start);
  end if;
end $$;

revoke all on table public.checklist_items from public, anon;
revoke all on table public.checklist_day_logs from public, anon;
revoke all on table public.checklist_week_targets from public, anon;

grant select, insert, update, delete on table public.checklist_items to authenticated;
grant select, insert, update, delete on table public.checklist_day_logs to authenticated;
grant select, insert, update, delete on table public.checklist_week_targets to authenticated;

drop policy if exists checklist_items_select on public.checklist_items;
drop policy if exists checklist_items_insert on public.checklist_items;
drop policy if exists checklist_items_update on public.checklist_items;
drop policy if exists checklist_items_delete on public.checklist_items;
drop policy if exists checklist_day_logs_select on public.checklist_day_logs;
drop policy if exists checklist_day_logs_insert on public.checklist_day_logs;
drop policy if exists checklist_day_logs_update on public.checklist_day_logs;
drop policy if exists checklist_day_logs_delete on public.checklist_day_logs;
drop policy if exists checklist_week_targets_select on public.checklist_week_targets;
drop policy if exists checklist_week_targets_insert on public.checklist_week_targets;
drop policy if exists checklist_week_targets_update on public.checklist_week_targets;
drop policy if exists checklist_week_targets_delete on public.checklist_week_targets;

create policy checklist_items_select on public.checklist_items
  for select to authenticated using (user_id = auth.uid());
create policy checklist_items_insert on public.checklist_items
  for insert to authenticated with check (user_id = auth.uid());
create policy checklist_items_update on public.checklist_items
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy checklist_items_delete on public.checklist_items
  for delete to authenticated using (user_id = auth.uid());

create policy checklist_day_logs_select on public.checklist_day_logs
  for select to authenticated using (user_id = auth.uid());
create policy checklist_day_logs_insert on public.checklist_day_logs
  for insert to authenticated with check (user_id = auth.uid());
create policy checklist_day_logs_update on public.checklist_day_logs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy checklist_day_logs_delete on public.checklist_day_logs
  for delete to authenticated using (user_id = auth.uid());

create policy checklist_week_targets_select on public.checklist_week_targets
  for select to authenticated using (user_id = auth.uid());
create policy checklist_week_targets_insert on public.checklist_week_targets
  for insert to authenticated with check (user_id = auth.uid());
create policy checklist_week_targets_update on public.checklist_week_targets
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy checklist_week_targets_delete on public.checklist_week_targets
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.claim_legacy_checklist()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text;
  confirmed_at timestamptz;
begin
  -- Trust the auth.users row, not the JWT email claim by itself.
  select lower(u.email), u.email_confirmed_at
    into caller_email, confirmed_at
  from auth.users as u
  where u.id = auth.uid();

  if confirmed_at is null or caller_email is distinct from 'jacksontylerbruce@gmail.com' then
    return;
  end if;
  if not exists (select 1 from public.checklist_legacy_items)
     and not exists (select 1 from public.checklist_legacy_day_logs)
     and not exists (select 1 from public.checklist_legacy_week_targets) then
    return;
  end if;

  -- On conflict, overwrite the live row with the legacy values so the
  -- original is not dropped. Delete a holding row only after that copy exists.
  -- A WHERE clause satisfies pg_safeupdate, which rejects a bare DELETE over the API.
  insert into public.checklist_items (user_id, id, label, category, sort_order, active, public_streak, note, tags, track)
  select auth.uid(), id, label, category, sort_order, active, public_streak, note, tags, track
  from public.checklist_legacy_items
  on conflict (user_id, id) do update
  set label = excluded.label,
      category = excluded.category,
      sort_order = excluded.sort_order,
      active = excluded.active,
      public_streak = excluded.public_streak,
      note = excluded.note,
      tags = excluded.tags,
      track = excluded.track;
  delete from public.checklist_legacy_items as legacy
  where true
    and exists (
      select 1 from public.checklist_items as live
      where live.user_id = auth.uid() and live.id = legacy.id
    );

  insert into public.checklist_day_logs (user_id, day, checks, spend, note)
  select auth.uid(), day, checks, spend, note
  from public.checklist_legacy_day_logs
  on conflict (user_id, day) do update
  set checks = excluded.checks,
      spend = excluded.spend,
      note = excluded.note;
  delete from public.checklist_legacy_day_logs as legacy
  where true
    and exists (
      select 1 from public.checklist_day_logs as live
      where live.user_id = auth.uid() and live.day = legacy.day
    );

  insert into public.checklist_week_targets (user_id, week_start, targets, sunday_review)
  select auth.uid(), week_start, targets, sunday_review
  from public.checklist_legacy_week_targets
  on conflict (user_id, week_start) do update
  set targets = excluded.targets,
      sunday_review = excluded.sunday_review;
  delete from public.checklist_legacy_week_targets as legacy
  where true
    and exists (
      select 1 from public.checklist_week_targets as live
      where live.user_id = auth.uid() and live.week_start = legacy.week_start
    );
end;
$$;

revoke all on function public.claim_legacy_checklist() from public;
revoke all on function public.claim_legacy_checklist() from anon;
grant execute on function public.claim_legacy_checklist() to authenticated;

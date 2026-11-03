-- Private checklist. The server uses the service role.
-- RLS is enabled and no policies are granted to anon or authenticated.

create table public.checklist_items (
  id text primary key,
  label text not null,
  category text not null,
  sort_order integer not null,
  active boolean not null default true,
  public_streak boolean not null default false,
  note text,
  tags text[] not null default '{}',
  track text,
  constraint checklist_items_category_check check (category in ('Spirit', 'Body', 'Mind', 'Money', 'Rest')),
  constraint checklist_items_track_check check (track is null or track = 'spend'),
  constraint checklist_items_label_check check (char_length(label) between 1 and 120)
);

create table public.checklist_day_logs (
  day date primary key,
  checks jsonb not null default '{}'::jsonb,
  spend numeric,
  note text,
  constraint checklist_day_logs_spend_check check (spend is null or (spend >= 0 and spend <= 1000000000))
);

create table public.checklist_week_targets (
  week_start date primary key,
  targets jsonb not null,
  sunday_review text,
  constraint checklist_week_targets_monday check (extract(isodow from week_start) = 1)
);

alter table public.checklist_items enable row level security;
alter table public.checklist_day_logs enable row level security;
alter table public.checklist_week_targets enable row level security;

revoke all on table public.checklist_items from anon, authenticated;
revoke all on table public.checklist_day_logs from anon, authenticated;
revoke all on table public.checklist_week_targets from anon, authenticated;

grant all on table public.checklist_items to service_role;
grant all on table public.checklist_day_logs to service_role;
grant all on table public.checklist_week_targets to service_role;

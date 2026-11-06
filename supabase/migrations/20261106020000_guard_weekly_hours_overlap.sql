-- Prevent overlapping enabled weekly hours, including concurrent inserts/updates.
-- No schedule rows are deleted or modified by this migration.
create extension if not exists btree_gist with schema public;

do $preflight$
begin
  if exists (
    select 1
    from public.weekly_hours a
    join public.weekly_hours b
      on a.weekday = b.weekday
     and a.id < b.id
    where a.is_enabled
      and b.is_enabled
      and a.opens_at < b.closes_at
      and b.opens_at < a.closes_at
  ) then
    raise exception 'Existing enabled weekly_hours overlap. Review existing rows before applying this migration; no rows were changed.';
  end if;
end
$preflight$;

do $constraint$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.weekly_hours'::regclass
      and conname = 'weekly_hours_enabled_no_overlap'
  ) then
    alter table public.weekly_hours
      add constraint weekly_hours_enabled_no_overlap
      exclude using gist (
        weekday with =,
        tsrange(
          date '2000-01-01' + opens_at,
          date '2000-01-01' + closes_at,
          '[)'
        ) with &&
      )
      where (is_enabled);
  end if;
end
$constraint$;

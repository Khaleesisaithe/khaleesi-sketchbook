-- Extensão aditiva do perfil social. Não remove nem sobrescreve dados existentes.
-- Execute no SQL Editor do projeto Supabase após revisar o destino.

alter table public.artist_profile
  add column if not exists youtube_url text not null default '',
  add column if not exists external_portfolio_url text not null default '',
  add column if not exists instagram_post_urls text[] not null default '{}',
  add column if not exists instagram_featured_post_url text not null default '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'artist_profile_youtube_url_https_check' and conrelid = 'public.artist_profile'::regclass) then
    alter table public.artist_profile
      add constraint artist_profile_youtube_url_https_check
      check (youtube_url = '' or youtube_url ~* '^https://([a-z0-9-]+\.)?youtube\.com(/|$)' or youtube_url ~* '^https://youtu\.be(/|$)');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'artist_profile_external_portfolio_https_check' and conrelid = 'public.artist_profile'::regclass) then
    alter table public.artist_profile
      add constraint artist_profile_external_portfolio_https_check
      check (external_portfolio_url = '' or (char_length(external_portfolio_url) <= 1000 and external_portfolio_url ~* '^https://[^[:space:]]+$'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'artist_profile_instagram_posts_count_check' and conrelid = 'public.artist_profile'::regclass) then
    alter table public.artist_profile
      add constraint artist_profile_instagram_posts_count_check
      check (coalesce(array_length(instagram_post_urls, 1), 0) <= 12);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'artist_profile_instagram_featured_member_check' and conrelid = 'public.artist_profile'::regclass) then
    alter table public.artist_profile
      add constraint artist_profile_instagram_featured_member_check
      check (instagram_featured_post_url = '' or instagram_featured_post_url = any(instagram_post_urls));
  end if;
end;
$$;

-- Execute em um projeto Supabase local/de desenvolvimento depois da migration.
-- Use uma base descartável: este script reverte todas as alterações ao final.
begin;

set local role anon;
do $$
declare visible integer;
begin
  begin
    select count(*) into visible from public.appointments;
    if visible <> 0 then raise exception 'FAIL: anon conseguiu consultar dados pessoais de appointments'; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    select count(*) into visible from public.privacy_requests;
    if visible <> 0 then raise exception 'FAIL: anon conseguiu consultar privacy_requests'; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    select count(*) into visible from public.email_delivery_logs;
    if visible <> 0 then raise exception 'FAIL: anon conseguiu consultar email_delivery_logs'; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.appointments (full_name, email, whatsapp, tattoo_description, body_location, approximate_size, scheduled_start, scheduled_end, privacy_consent)
    values ('Teste', 'teste@example.test', '+5500000000000', 'Desenho de teste para verificar RLS', 'braço', '5cm', now() + interval '1 day', now() + interval '2 days', true);
    raise exception 'FAIL: anon conseguiu inserir diretamente em appointments';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name)
    values ('portfolio-images', 'teste-nao-autorizado.png');
    raise exception 'FAIL: anon conseguiu enviar foto ao bucket';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000099', true);
do $$
declare affected integer;
begin
  update public.artist_profile set artist_name = 'Não autorizado' where id = 1;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: usuário sem papel alterou artist_profile'; end if;

  update public.appointments set status = 'approved' where status = 'pending';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: usuário sem papel alterou appointments'; end if;

  select count(*) into affected from public.privacy_requests;
  if affected <> 0 then raise exception 'FAIL: usuário sem papel consultou solicitações de privacidade'; end if;

  select count(*) into affected from public.email_delivery_logs;
  if affected <> 0 then raise exception 'FAIL: usuário sem papel consultou emails'; end if;
end $$;

rollback;

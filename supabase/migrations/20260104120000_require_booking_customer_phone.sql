-- Exigir telefone do cliente (DDD + número) em novas reservas.
-- Mantém reservas antigas sem telefone como estão (o trigger só barra INSERT e UPDATE do campo).

begin;

-- Normaliza: remove qualquer caractere não numérico e converte string vazia para NULL.
update public.bookings
set customer_phone = nullif(regexp_replace(customer_phone, '\D', '', 'g'), '')
where customer_phone is not null;

create or replace function public.fn_bookings_require_customer_phone()
returns trigger
language plpgsql
as $$
begin
  -- Exige apenas dígitos (10 ou 11) para viabilizar WhatsApp (ex.: 11999999999)
  if new.customer_phone is null or new.customer_phone !~ '^[0-9]{10,11}$' then
    raise exception using
      errcode = '23514',
      message = 'Telefone do cliente é obrigatório (DDD + número: 10 ou 11 dígitos).';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_bookings_require_customer_phone on public.bookings;

create trigger trg_bookings_require_customer_phone
before insert or update of customer_phone
on public.bookings
for each row
execute function public.fn_bookings_require_customer_phone();

commit;

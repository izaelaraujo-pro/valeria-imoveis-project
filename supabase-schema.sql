-- Portal Imobiliário Valeria
-- Execute no SQL Editor do Supabase usando uma conta proprietária do projeto.

create extension if not exists pgcrypto;

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  property_type text not null check (property_type in ('Casa','Apartamento','Terreno','Comercial','Outro')),
  purpose text not null check (purpose in ('Venda','Aluguel')),
  price numeric(14,2) not null check (price >= 0),
  status text not null default 'draft' check (status in ('published','draft','sold')),
  bedrooms integer not null default 0 check (bedrooms >= 0),
  bathrooms integer not null default 0 check (bathrooms >= 0),
  parking integer not null default 0 check (parking >= 0),
  area numeric(10,2) check (area is null or area >= 0),
  condo_fee numeric(14,2) check (condo_fee is null or condo_fee >= 0),
  property_tax numeric(14,2) check (property_tax is null or property_tax >= 0),
  address text,
  neighborhood text,
  city text,
  state text,
  description text,
  images text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists properties_public_listing_idx
  on public.properties(status, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_properties_updated_at on public.properties;
create trigger set_properties_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

alter table public.properties enable row level security;

-- Visitantes anônimos e usuários autenticados só leem imóveis publicados.
drop policy if exists "Public can read published properties" on public.properties;
create policy "Public can read published properties"
on public.properties for select
to anon, authenticated
using (status = 'published' or (auth.uid() is not null));

-- CRUD apenas para usuários autenticados. Crie somente a conta do administrador
-- em Authentication > Users; não habilite cadastro público.
drop policy if exists "Authenticated users can insert properties" on public.properties;
create policy "Authenticated users can insert properties"
on public.properties for insert to authenticated
with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update properties" on public.properties;
create policy "Authenticated users can update properties"
on public.properties for update to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "Authenticated users can delete properties" on public.properties;
create policy "Authenticated users can delete properties"
on public.properties for delete to authenticated
using (auth.uid() is not null);

grant select on public.properties to anon, authenticated;
grant insert, update, delete on public.properties to authenticated;

-- Bucket público para exibição das fotos. O upload e a remoção exigem login.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-images', 'property-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public can view property images" on storage.objects;
create policy "Public can view property images"
on storage.objects for select to public
using (bucket_id = 'property-images');

drop policy if exists "Authenticated can upload property images" on storage.objects;
create policy "Authenticated can upload property images"
on storage.objects for insert to authenticated
with check (bucket_id = 'property-images' and auth.uid() is not null);

drop policy if exists "Authenticated can update property images" on storage.objects;
create policy "Authenticated can update property images"
on storage.objects for update to authenticated
using (bucket_id = 'property-images' and auth.uid() is not null)
with check (bucket_id = 'property-images' and auth.uid() is not null);

drop policy if exists "Authenticated can delete property images" on storage.objects;
create policy "Authenticated can delete property images"
on storage.objects for delete to authenticated
using (bucket_id = 'property-images' and auth.uid() is not null);

create extension if not exists vector with schema extensions;

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text not null,
  price       integer not null,
  badge       text,
  embedding   extensions.vector(768),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists products_embedding_hnsw_idx
  on public.products
  using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);

alter table public.products enable row level security;

create policy "Public products are readable by everyone"
  on public.products for select using (true);

create policy "Service role can manage products"
  on public.products for all using (auth.role() = 'service_role');

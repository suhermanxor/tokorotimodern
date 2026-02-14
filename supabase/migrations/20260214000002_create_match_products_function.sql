create or replace function public.match_products(
  query_embedding  extensions.vector(768),
  match_count      int default 3,
  match_threshold  float default 0.2
)
returns table (id uuid, name text, description text, price integer, badge text, similarity float)
language plpgsql as $$
begin
  return query
  select p.id, p.name, p.description, p.price, p.badge,
    1 - (p.embedding <=> query_embedding) as similarity
  from public.products p
  where p.embedding is not null
    and 1 - (p.embedding <=> query_embedding) > match_threshold
  order by p.embedding <=> query_embedding
  limit match_count;
end;
$$;

grant execute on function public.match_products(extensions.vector, int, float) to anon, authenticated;


-- Supabase: apply after the core migrations. PGlite demo uses lexical retrieval.
create extension if not exists vector with schema extensions;
alter table public.document_chunks add column embedding extensions.vector(1536);
create index document_embedding_idx on public.document_chunks using hnsw (embedding extensions.vector_cosine_ops);
create function public.match_event_documents(p_event_id uuid, query_embedding extensions.vector(1536), match_count integer default 5)
returns table(id uuid,title text,content text,similarity float) language sql stable security invoker set search_path='' as $$
 select c.id,d.title,c.content,1-(c.embedding OPERATOR(extensions.<=>) query_embedding)
 from public.document_chunks c join public.event_documents d on d.id=c.document_id
 where d.event_id=p_event_id and private.event_role(p_event_id,array['owner','admin','manager']) and c.embedding is not null
 order by c.embedding OPERATOR(extensions.<=>) query_embedding limit least(greatest(match_count,1),10);
$$;
revoke all on function public.match_event_documents(uuid,extensions.vector,integer) from public,anon;
grant execute on function public.match_event_documents(uuid,extensions.vector,integer) to authenticated;

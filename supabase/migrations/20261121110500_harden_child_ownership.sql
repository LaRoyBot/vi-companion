-- Child rows may only point at parent rows owned by the same authenticated user.
drop policy if exists objective_updates_own on public.objective_updates;
create policy objective_updates_own on public.objective_updates for all to authenticated
using(user_id=(select auth.uid()) and exists(select 1 from public.objectives o where o.id=objective_id and o.user_id=(select auth.uid())))
with check(user_id=(select auth.uid()) and exists(select 1 from public.objectives o where o.id=objective_id and o.user_id=(select auth.uid())));
drop policy if exists collection_items_own on public.collection_items;
create policy collection_items_own on public.collection_items for all to authenticated
using(user_id=(select auth.uid()) and exists(select 1 from public.collections c where c.id=collection_id and c.user_id=(select auth.uid())))
with check(user_id=(select auth.uid()) and exists(select 1 from public.collections c where c.id=collection_id and c.user_id=(select auth.uid())));

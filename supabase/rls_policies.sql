drop policy if exists "events_public_or_editor_select" on public.events;
create policy "events_public_or_editor_select"
on public.events
for select
using (
  is_public = true
  or exists (
    select 1
    from public.editor_users eu
    where eu.user_id = auth.uid()
  )
);

drop policy if exists "events_editor_insert" on public.events;
create policy "events_editor_insert"
on public.events
for insert
with check (
  exists (
    select 1
    from public.editor_users eu
    where eu.user_id = auth.uid()
  )
);

drop policy if exists "events_editor_update" on public.events;
create policy "events_editor_update"
on public.events
for update
using (
  exists (
    select 1
    from public.editor_users eu
    where eu.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.editor_users eu
    where eu.user_id = auth.uid()
  )
);

drop policy if exists "events_editor_delete" on public.events;
create policy "events_editor_delete"
on public.events
for delete
using (
  exists (
    select 1
    from public.editor_users eu
    where eu.user_id = auth.uid()
  )
);

drop policy if exists "editor_users_self_select" on public.editor_users;
create policy "editor_users_self_select"
on public.editor_users
for select
using (user_id = auth.uid());

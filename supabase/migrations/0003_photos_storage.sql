-- ─── family-photos storage bucket ───────────────────────────
-- Public read, authenticated write. Used by the kitchen display
-- for rotating family photos.

insert into storage.buckets (id, name, public)
values ('family-photos', 'family-photos', true)
on conflict (id) do nothing;

-- Public can read photos (so the kitchen TV can load them without auth)
drop policy if exists "family_photos_public_read" on storage.objects;
create policy "family_photos_public_read" on storage.objects
  for select using (bucket_id = 'family-photos');

-- Service role bypasses RLS, so admin uploads via /api/admin/photos work
-- without needing per-user policies. We don't grant client-side upload.

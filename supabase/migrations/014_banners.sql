-- =====================================================================
-- Home-page scrolling banners (16:6 images, optional external link).
-- Equivalent to reference 007_banners.sql
-- Safe to run multiple times (uses IF NOT EXISTS, CREATE OR REPLACE)
-- =====================================================================

create table if not exists public.banners (
  id          uuid primary key default gen_random_uuid(),
  image_url   text not null check (image_url ~* '^https?://'),
  image_path  text,                                   -- storage path, so the file can be removed with the banner
  link_url    text check (link_url is null or link_url ~* '^https?://'),
  title       text check (title is null or char_length(title) <= 160),
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists banners_order_idx on public.banners (is_active, sort_order, created_at);

alter table public.banners enable row level security;
drop policy if exists "banners: read active" on public.banners;
drop policy if exists "banners: admin write" on public.banners;
create policy "banners: read active" on public.banners for select using (is_active or public.is_admin());
create policy "banners: admin write" on public.banners for all using (public.is_admin()) with check (public.is_admin());
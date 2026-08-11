-- Docker 首次初始化：仅准备 auth schema 与 search_path。
-- 业务表见 supabase/migrations/001–003，须在 GoTrue 首次启动并建好 auth.users 后再手工执行。
CREATE SCHEMA IF NOT EXISTS auth;

ALTER DATABASE wardrobe SET search_path TO public, auth;

-- GoTrue 尚未创建 auth.users 前，业务迁移不能跑。
-- 本文件仅在「Auth 已成功启动至少一次」后执行（见 docs/local-setup-guide.md）。
-- 内容与 docker-init 一致，便于手工补跑 search_path。
CREATE SCHEMA IF NOT EXISTS auth;
ALTER DATABASE wardrobe SET search_path TO public, auth;

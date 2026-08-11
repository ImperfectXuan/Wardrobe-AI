# Wardrobe AI 本地环境配置与联调手册（小白版）

> 目标：在你自己的电脑上，把 **Supabase（登录+数据库）**、**MinIO（图片）**、**FastAPI（AI）**、**Next.js（网站）** 跑通，并完成真实注册登录与接口联调。  
> 适合：没配过这类环境的同学。请按章节顺序做，不要跳步。

相关文档：

- 架构说明：`docs/technical-architecture.md`
- 阶段测试：`docs/testing-guide.md`
- 环境变量模板：根目录 `.env.example`

---

## 0. 你会得到什么

完成后应具备：

1. 浏览器打开 `http://localhost:3000` 能注册 / 登录  
2. 登录后能访问 `/wardrobe`  
3. `http://localhost:8000/auth/v1/health`（或 settings）有响应  
4. MinIO 控制台 `http://localhost:9001` 能登录  
5. FastAPI `http://localhost:8001/health` 返回 `{"status":"ok"}`  
6.（可选）AI 识别能通（Ollama 或阿里百炼二选一）

---

## 1. 准备软件（只需装一次）

| 软件 | 用途 | 如何确认 |
|---|---|---|
| Docker Desktop | 跑数据库、Auth、Kong、MinIO、FastAPI、Ollama | 图标显示 Running；终端 `docker version` 有输出 |
| Node.js 20+ | 跑 Next.js、生成 JWT 密钥脚本 | `node -v`、`npm -v` |
| Git | 拉代码 | `git --version` |
| 浏览器 | Chrome / Edge / Safari | 能打开本地网页 |

项目目录（按你机器路径调整）：

```bash
cd "/Users/xuanyi/code/Wardrobe AI"
```

下文用「项目根目录」指这里。

---

## 2. 配置环境变量（最关键、最容易错）

### 2.1 复制模板

```bash
cd "/Users/xuanyi/code/Wardrobe AI"
cp .env.example .env
```

### 2.2 为什么不能直接用 `your-anon-key`

自托管 Auth / PostgREST 用同一个 **`JWT_SECRET`** 校验令牌。  
`ANON_KEY`、`SERVICE_ROLE_KEY` 必须是：**用这个密钥签出来的 JWT**，不能是随便写的字符串。

三者关系：

```text
JWT_SECRET  ──签名──►  ANON_KEY（给浏览器 / 前端用，role=anon）
            ──签名──►  SERVICE_ROLE_KEY（仅服务端，role=service_role，权限更大）
```

### 2.3 推荐做法：用脚本生成密钥

1. 先打开 `.env`，把 `JWT_SECRET` 改成**至少 32 个字符**的随机串，例如：

```env
JWT_SECRET=wardrobe-local-dev-jwt-secret-32chars-min
POSTGRES_PASSWORD=wardrobe-local-db-password
```

2. 在项目根目录运行：

```bash
node scripts/generate-supabase-keys.mjs
```

脚本会打印一整段可复制的变量。把输出写回 `.env` 中对应项，至少确保这 5 个一致：

| 变量 | 说明 |
|---|---|
| `JWT_SECRET` | 签名密钥（Auth、PostgREST 共用） |
| `ANON_KEY` | 给客户端用的 anon JWT |
| `SERVICE_ROLE_KEY` | 服务端用（不要暴露到浏览器） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **必须等于** `ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | **必须等于** `SERVICE_ROLE_KEY` |

也可以显式传入密钥：

```bash
node scripts/generate-supabase-keys.mjs "wardrobe-local-dev-jwt-secret-32chars-min"
```

### 2.4 备选：使用官方演示密钥对（快速试验）

若你只想尽快冒烟，可把 `.env` 里设为社区常用演示组合（**仅本地**，勿用于公网）：

```env
JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q
```

注意：演示密钥的 `iss` 等字段与自签脚本略有不同，但与上述 `JWT_SECRET` 是配对的。**不要**把演示 `ANON_KEY` 配到你自己随便写的 `JWT_SECRET` 上。

### 2.5 MinIO / 基础项（一般可保持默认）

```env
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_BUCKET=wardrobe-images
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
NEXT_PUBLIC_MINIO_ENDPOINT=localhost
NEXT_PUBLIC_MINIO_PORT=9000
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
```

### 2.6 AI 相关（先选一种模式）

**模式 A：本机 Ollama（推荐本地免费调试）**

```env
MODEL=ollama
# BAILIAN_API_KEY 可先留空
```

**模式 B：阿里百炼（需要你有 API Key）**

```env
MODEL=bailian
BAILIAN_API_KEY=填你的真实 Key
BAILIAN_MODEL=qwen-vl-max
```

### 2.7 给 Next.js 单独一份 `nextjs/.env.local`

本机用 `npm run dev` 时，Next **不会**自动读根目录 `.env`，需要：

```bash
# 在项目根目录执行（示例：把关键变量同步过去）
grep -E '^(NEXT_PUBLIC_|SUPABASE_|MINIO_|FASTAPI_URL)' .env > nextjs/.env.local
```

然后**务必改一行**（本机进程访问 AI 要用 localhost，不是 Docker 内网主机名）：

```env
FASTAPI_URL=http://localhost:8001
```

> 根目录 `.env` 里若写 `FASTAPI_URL=http://fastapi:8001`，那是给 **Docker 里的 nextjs 容器** 用的，两者不要混。

`nextjs/.env.local` 已被 gitignore，不要提交。

---

## 3. 启动 Docker 服务

### 3.1 打开 Docker Desktop

等到状态为 Running。

### 3.2 建议启动顺序（降低一次起全栈的挫败感）

```bash
cd "/Users/xuanyi/code/Wardrobe AI"

# 1) 数据库
docker compose up -d db

# 2) 等 healthy 后起 Auth + REST + Kong
docker compose up -d supabase-auth supabase-rest supabase-kong

# 3) 图片
docker compose up -d minio minio-init

# 4) AI（按需；百炼模式可不依赖 ollama）
docker compose up -d fastapi
# 若 MODEL=ollama，再起：
docker compose up -d ollama
```

一次全起也可以：

```bash
docker compose up -d
```

查看状态：

```bash
docker compose ps
```

### 3.3 改过密钥之后必须重建相关容器

只改 `.env` 不够，Auth/REST 需要重新读环境变量：

```bash
docker compose up -d --force-recreate supabase-auth supabase-rest supabase-kong supabase-storage
```

### 3.4 数据库迁移说明

- **Docker 首次 init** 只跑 [`supabase/docker-init/`](../supabase/docker-init/)（创建 `auth` schema + `search_path`）。  
- **业务表**在 [`supabase/migrations/`](../supabase/migrations/)（`001`–`003`），必须等 **GoTrue（supabase-auth）至少成功启动一次**（已写入 `auth.users`）后再手工执行。  
- 若数据卷已存在，新 SQL **不会**自动再跑。

推荐顺序（新环境）：

```bash
docker compose up -d db minio minio-init
# 等待 db healthy
docker compose up -d supabase-auth
# 确认：docker compose logs supabase-auth | grep "API started"
docker compose up -d supabase-rest supabase-kong supabase-storage

docker compose exec -T db psql -U postgres -d wardrobe < supabase/migrations/000_auth_schema.sql
docker compose exec -T db psql -U postgres -d wardrobe < supabase/migrations/001_schema.sql
docker compose exec -T db psql -U postgres -d wardrobe < supabase/migrations/002_rls_clothing_tags_delete.sql
docker compose exec -T db psql -U postgres -d wardrobe < supabase/migrations/003_profiles_insert.sql
```

检查是否已有业务表：

```bash
docker compose exec db psql -U postgres -d wardrobe -c '\dt public.*'
```

想「彻底重来」（会清空数据库数据）：

```bash
docker compose down -v
docker compose up -d
# 再按上面顺序等 Auth 就绪后执行 migrations
```

### 3.5 关于 `auth.users` 与 GoTrue

业务表外键引用 `auth.users`，故 **禁止**在 Auth 未就绪时执行 `001_schema.sql`。

常见坑：

| 现象 | 处理 |
|---|---|
| `relation "auth.users" does not exist` | 先起 `supabase-auth`，再跑 `001` |
| GoTrue：`API_EXTERNAL_URL` missing | 已在 compose 中配置；改后 `force-recreate supabase-auth` |
| GoTrue：`relation "identities" does not exist` | 执行 `ALTER DATABASE wardrobe SET search_path TO public, auth;` 后重启 auth |
| Kong：`oidc plugin is enabled but not installed` | `KONG_PLUGINS` 只用 `bundled` |
| 宿主机 `5000` 被占用 | Storage 已映射为 `5001:5000` |
| Kong 转发 404 | `kong.yml` 对 `/auth/v1` 使用 `strip_path: true` |

---

## 4. 启动 Next.js（网站）

```bash
cd "/Users/xuanyi/code/Wardrobe AI/nextjs"
npm install
npm run dev
```

浏览器打开：`http://localhost:3000`

改过 `nextjs/.env.local` 后必须重启 `npm run dev`。

---

## 5. 连通性验收（请逐条勾选）

### 5.1 基础设施

```bash
# Kong / Auth（路径以实际响应为准，能连上即可）
curl -sI http://localhost:8000/auth/v1/health | head -5

# MinIO
curl -sI http://localhost:9000/minio/health/live | head -5

# FastAPI
curl -s http://localhost:8001/health
# 期望：{"status":"ok"}
```

- [ ] Auth / Kong 有 HTTP 响应  
- [ ] MinIO live 正常  
- [ ] FastAPI health 正常  
- [ ] `docker compose ps` 无反复 Restarting  

### 5.2 前端认证（密钥配置正确后）

1. 无痕窗口打开 `http://localhost:3000/auth/register`  
2. 注册新邮箱（密码 ≥ 8 位）  
3. 期望：成功并进入首页  
4. 打开 `http://localhost:3000/wardrobe` → 不应再跳回登录  

- [ ] 注册成功  
- [ ] 登录成功  
- [ ] 受保护路由可进入  

失败时先看：

- 浏览器 F12 → Console / Network  
- `docker compose logs --tail=80 supabase-auth`  
- `.env` 与 `nextjs/.env.local` 的 `ANON_KEY` 是否一致、是否仍是占位符  

### 5.3 API（登录后）

未登录应返回 401：

```bash
curl -s http://localhost:3000/api/clothing
# {"success":false,"error":"未登录"}
```

登录后的 Cookie/Token 测试步骤见 `docs/testing-guide.md` 阶段 III。

### 5.4 FastAPI 识别冒烟（可选）

先确认 MinIO 里已有一张可公网（本机）访问的图片 URL，然后：

```bash
curl -s http://localhost:8001/recognize \
  -H 'Content-Type: application/json' \
  -d '{"image_url":"http://host.docker.internal:9000/wardrobe-images/你的路径.png"}'
```

说明：

- FastAPI 在容器内访问你本机 MinIO，Mac 上常用 `host.docker.internal` 代替 `localhost`。  
- 若 `MODEL=ollama`，需先拉取视觉模型（见下一章）。  
- 若 `MODEL=bailian`，需有效 `BAILIAN_API_KEY`。  

---

## 6. FastAPI：Ollama 与阿里百炼怎么配

代码通过环境变量 `MODEL` 选择策略（见 `fastapi/app/services/recognition.py`）。

### 6.1 Ollama 本地模式

1. `.env` 设 `MODEL=ollama`  
2. 启动：`docker compose up -d ollama fastapi`  
3. 进入容器拉模型（模型名以适配器默认为准，常见为视觉小模型；以代码/环境 `OLLAMA_MODEL` 为准）：

```bash
docker compose exec ollama ollama pull minicpm-v
# 或你在环境变量里指定的模型名
```

4. 重建 FastAPI 使环境生效：`docker compose up -d --force-recreate fastapi`  
5. 再测 `/health` 与 `/recognize`  

注意：首次下模型体积大、耗时长；内存不够会失败或极慢。

### 6.2 阿里百炼模式

1. 在阿里云百炼控制台创建 API Key  
2. `.env`：

```env
MODEL=bailian
BAILIAN_API_KEY=sk-xxxx
BAILIAN_MODEL=qwen-vl-max
```

3. `docker compose up -d --force-recreate fastapi`  
4. 本机访问外网需畅通  

### 6.3 Next.js 调 AI 的路径

浏览器 → `POST /api/clothing/ai/recognize` →（上传 MinIO）→ `recognizeClothing()` → `FASTAPI_URL/recognize`。

本机 `npm run dev` 时 `FASTAPI_URL` 必须是 `http://localhost:8001`。

---

## 7. 日常开发常用命令

```bash
# 看服务
docker compose ps

# 看日志
docker compose logs -f fastapi
docker compose logs -f supabase-auth

# 只重启某一服务
docker compose restart fastapi

# 停掉全部（保留数据）
docker compose down

# 停掉并清空数据卷（危险）
docker compose down -v
```

端口速查：

| 端口 | 服务 |
|---|---|
| 3000 | Next.js |
| 8000 | Kong（Supabase 入口） |
| 8001 | FastAPI |
| 9000 | MinIO API |
| 9001 | MinIO Console |
| 5432 | PostgreSQL |
| 11434 | Ollama |

---

## 8. 故障速查表

| 现象 | 优先检查 |
|---|---|
| 注册/登录一直失败 | `ANON_KEY` 是否占位符；是否与 `JWT_SECRET` 匹配；`.env` 与 `.env.local` 是否一致；Auth 容器是否 healthy |
| `/wardrobe` 总跳登录 | 登录其实没成功；Cookie 被拦；密钥不一致导致会话无效 |
| `GET /api/clothing` 401 | 正常（未登录）；登录后再带 Cookie 测 |
| MinIO 上传 500 | MinIO 没起；`MINIO_*` 账号密码不一致 |
| AI 500「无法连接 AI 服务」 | FastAPI 没起；`FASTAPI_URL` 写成了 `http://fastapi:8001` 却在宿主机跑 Next |
| AI 500 模型报错 | Ollama 没拉模型 / 百炼 Key 无效 / 图片 URL 容器内访问不到 |
| 改了 `.env` 没效果 | 忘记 `--force-recreate`；忘记改 `.env.local`；忘记重启 `npm run dev` |
| 新 migration 不生效 | 旧数据卷还在，需手工 `psql < 文件` 或 `down -v` 重建 |

---

## 9. 推荐的一次「从零到可测」清单

按顺序打勾：

1. [ ] 安装 Docker Desktop + Node.js  
2. [ ] `cp .env.example .env`，设置 `POSTGRES_PASSWORD`、`JWT_SECRET`  
3. [ ] `node scripts/generate-supabase-keys.mjs`，写回 `.env`  
4. [ ] 同步 `nextjs/.env.local`，并把 `FASTAPI_URL` 改为 `http://localhost:8001`  
5. [ ] 选择 `MODEL=ollama` 或 `bailian` 并填好对应配置  
6. [ ] `docker compose up -d`（或按第 3 章分段启动）  
7. [ ] 验收 health（第 5.1 节）  
8. [ ] `cd nextjs && npm run dev`  
9. [ ] 注册登录成功，进入 `/wardrobe`  
10. [ ] 回到 `docs/testing-guide.md` 做阶段 I–III 勾选  

做到第 9 步，本地 Supabase + FastAPI + 前端的人工配置即告完成。

---

## 10. 安全提醒

- 不要把含真实 `BAILIAN_API_KEY`、`SERVICE_ROLE_KEY` 的 `.env` / `.env.local` 提交到 GitHub。  
- `SERVICE_ROLE_KEY` 可绕过 RLS，只能放在服务端。  
- 演示用 JWT 密钥对禁止用于公网部署。

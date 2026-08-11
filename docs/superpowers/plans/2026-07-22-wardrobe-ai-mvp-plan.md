# Wardrobe AI MVP 实现计划

> **对于自动化工作者：** 需要使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 来按任务逐个实现。步骤使用 checkbox（`- [ ]`）语法追踪。

**目标：** 构建 Wardrobe AI MVP — 一个具有 AI 驱动衣物识别的数字衣橱管理平台，实现用户注册、衣柜管理、搜索筛选和仪表盘统计。

**架构：** Next.js (App Router) 前端 + BFF，通过 Docker Compose 编排 Supabase 自托管（Auth + PostgreSQL）、Python FastAPI AI 服务和 MinIO 对象存储。AI 模型通过策略模式在 Ollama（本地调试）和阿里百炼（生产）之间切换。

**技术栈：** Next.js 15 + TypeScript + shadcn/ui + TailwindCSS、Supabase 自托管 (Docker)、Python FastAPI + Ollama + 阿里百炼、MinIO、Docker Compose

> **阶段 V 落地说明（2026-08）：** 页面集成已按 `nextjs/app/(authenticated)/` 路径落地（仪表盘 `/`、衣柜、设置）；设置页为昵称 + 头像，不含改密。

## 全局约束

- 所有 API 路由通过 Supabase Auth JWT 保护
- 删除操作使用软删除（`is_deleted = true`）
- 图片存储于 MinIO，数据库仅保存 URL
- AI 服务与 Next.js 间通过 HTTP 通信，`MODEL` 环境变量控制模型选择
- 分类（category）为互斥枚举值：上衣、裤子、外套、鞋子、配饰
- Git 提交使用中文 Conventional Commits

---

## 文件结构概览

```
wardrobe-ai/
├── docker-compose.yml
├── .env.example
├── nextjs/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── middleware.ts
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── minio.ts
│   │   ├── ai-client.ts
│   │   └── types.ts
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── callback/route.ts
│   │   ├── wardrobe/
│   │   │   ├── page.tsx
│   │   │   ├── add/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── edit/page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   └── api/
│   │       ├── auth/me/route.ts
│   │       ├── auth/profile/route.ts
│   │       ├── clothing/route.ts
│   │       ├── clothing/[id]/route.ts
│   │       ├── clothing/ai/recognize/route.ts
│   │       ├── tags/route.ts
│   │       └── stats/summary/route.ts
│   └── components/
│       ├── layout/
│       │   ├── Navbar.tsx
│       │   └── Sidebar.tsx
│       ├── wardrobe/
│       │   ├── ClothingCard.tsx
│       │   ├── ClothingGrid.tsx
│       │   ├── SearchBar.tsx
│       │   ├── UploadZone.tsx
│       │   ├── AIRecognitionPanel.tsx
│       │   └── ClothingForm.tsx
│       └── dashboard/
│           ├── StatCard.tsx
│           ├── CategoryPieChart.tsx
│           └── RecentItems.tsx
├── fastapi/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── api/routes.py
│       ├── models/
│       │   ├── base.py
│       │   ├── ollama.py
│       │   └── bailian.py
│       ├── services/recognition.py
│       └── schemas/clothing.py
└── supabase/
    └── migrations/
        └── 001_schema.sql
```

---

### Task 1: Docker Compose 基础编排 + 项目结构

**创建文件：**
- `docker-compose.yml`
- `.env.example`
- `supabase/migrations/001_schema.sql`
- `fastapi/Dockerfile`
- `fastapi/requirements.txt`
- `fastapi/app/main.py`（健康检查桩）
- `nextjs/Dockerfile`（开发模式）

**生成产物：** `docker compose up` 启动全部服务并验证连通性

**接口：**
- 消费：无
- 产出：Docker 网络 `wardrobe-net`，8 个服务的容器编排，端口映射如设计文档 7.1 节

- [ ] **步骤 1：创建 `.env.example` 环境变量模板**

```bash
# .env.example
# Supabase
POSTGRES_PASSWORD=your-super-secret-password
JWT_SECRET=your-jwt-secret-at-least-32-chars
ANON_KEY=your-anon-key
SERVICE_ROLE_KEY=your-service-role-key

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_BUCKET=wardrobe-images

# AI Service
MODEL=bailian
BAILIAN_API_KEY=your-bailian-api-key
BAILIAN_MODEL=qwen-vl-max

# Next.js
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_MINIO_ENDPOINT=localhost
NEXT_PUBLIC_MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=wardrobe-images
FASTAPI_URL=http://fastapi:8001
```

- [ ] **步骤 2：创建 `docker-compose.yml`**

```yaml
# docker-compose.yml
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: wardrobe
    volumes:
      - db_data:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  supabase-auth:
    image: supabase/gotrue:v2.164.0
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@db:5432/wardrobe?sslmode=disable
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
      GOTRUE_JWT_EXP: 3600
      GOTRUE_SITE_URL: http://localhost:3000
      GOTRUE_MAILER_AUTOCONFIRM: "true"
      GOTRUE_SMS_AUTOCONFIRM: "true"
      GOTRUE_DISABLE_SIGNUP: "false"
      GOTRUE_EXTERNAL_EMAIL_ENABLED: "false"
      GOTRUE_EXTERNAL_PHONE_ENABLED: "false"
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "9999:9999"

  supabase-storage:
    image: supabase/storage-api:v1.14.0
    environment:
      ANON_KEY: ${ANON_KEY}
      SERVICE_KEY: ${SERVICE_ROLE_KEY}
      POSTGREST_URL: http://supabase-rest:3000
      PGRST_JWT_SECRET: ${JWT_SECRET}
      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@db:5432/wardrobe?sslmode=disable
      FILE_SIZE_LIMIT: 10485760
      STORAGE_BACKEND: s3
      GLOBAL_S3_BUCKET: ${MINIO_BUCKET}
      GLOBAL_S3_ENDPOINT: http://minio:9000
      GLOBAL_S3_PROTOCOL: http
      GLOBAL_S3_FORCE_PATH_STYLE: "true"
      AWS_ACCESS_KEY_ID: ${MINIO_ROOT_USER}
      AWS_SECRET_ACCESS_KEY: ${MINIO_ROOT_PASSWORD}
      REGION: us-east-1
    depends_on:
      db:
        condition: service_healthy
      minio:
        condition: service_healthy
    ports:
      - "5000:5000"

  supabase-rest:
    image: postgrest/postgrest:v12.2.3
    environment:
      PGRST_DB_URI: postgres://postgres:${POSTGRES_PASSWORD}@db:5432/wardrobe?sslmode=disable
      PGRST_DB_SCHEMAS: public
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET}
      PGRST_DB_USE_LEGACY_GUCS: "false"
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "3001:3000"

  supabase-kong:
    image: kong:3.7
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /var/lib/kong/kong.yml
      KONG_PROXY_ACCESS_LOG: /dev/stdout
      KONG_ADMIN_ACCESS_LOG: /dev/stdout
      KONG_PROXY_ERROR_LOG: /dev/stderr
      KONG_ADMIN_ERROR_LOG: /dev/stderr
      KONG_ADMIN_LISTEN: 0.0.0.0:8001
      KONG_PLUGINS: bundled,oidc
    volumes:
      - ./kong.yml:/var/lib/kong/kong.yml
    depends_on:
      - supabase-auth
      - supabase-rest
      - supabase-storage
    ports:
      - "8000:8000"

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio-init:
    image: minio/mc
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: |
      /bin/sh -c "
      mc alias set local http://minio:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD};
      mc mb local/${MINIO_BUCKET} --ignore-existing;
      mc anonymous set download local/${MINIO_BUCKET};
      "

  fastapi:
    build: ./fastapi
    environment:
      MODEL: ${MODEL}
      BAILIAN_API_KEY: ${BAILIAN_API_KEY}
      BAILIAN_MODEL: ${BAILIAN_MODEL}
      OLLAMA_HOST: http://ollama:11434
    depends_on:
      - ollama
    volumes:
      - ./fastapi/app:/app
    ports:
      - "8001:8001"
    command: uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"

  nextjs:
    build:
      context: ./nextjs
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      NEXT_PUBLIC_MINIO_ENDPOINT: ${NEXT_PUBLIC_MINIO_ENDPOINT}
      NEXT_PUBLIC_MINIO_PORT: ${NEXT_PUBLIC_MINIO_PORT}
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
      MINIO_BUCKET: ${MINIO_BUCKET}
      FASTAPI_URL: ${FASTAPI_URL}
    volumes:
      - ./nextjs:/app
      - /app/node_modules
      - /app/.next
    ports:
      - "3000:3000"
    depends_on:
      - supabase-kong
      - minio
      - fastapi

volumes:
  db_data:
  minio_data:
  ollama_data:
```

- [ ] **步骤 3：创建 `kong.yml` Kong 声明式路由配置**

```yaml
# kong.yml
_format_version: "3.0"
_transform: true

services:
  - name: auth
    url: http://supabase-auth:9999
    routes:
      - name: auth-v1
        paths:
          - /auth/v1
        strip_path: false
    plugins:
      - name: cors
        config:
          origins: ["*"]
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
          headers: ["*"]
          exposed_headers: ["*"]
          credentials: true
          max_age: 3600

  - name: rest
    url: http://supabase-rest:3000
    routes:
      - name: rest-v1
        paths:
          - /rest/v1
        strip_path: false
    plugins:
      - name: cors
        config:
          origins: ["*"]
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
          headers: ["*"]
          exposed_headers: ["*"]
          credentials: true

  - name: storage
    url: http://supabase-storage:5000
    routes:
      - name: storage-v1
        paths:
          - /storage/v1
        strip_path: false
    plugins:
      - name: cors
        config:
          origins: ["*"]
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
          headers: ["*"]
          exposed_headers: ["*"]
          credentials: true
```

- [ ] **步骤 4：创建 `supabase/migrations/001_schema.sql`**

```sql
-- 001_schema.sql
-- 在 public schema 下创建业务表

-- 扩展用户 profiles 表（与 Supabase Auth 的 auth.users 关联）
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname VARCHAR(100),
  avatar_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 衣物表
CREATE TABLE public.clothing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('上衣', '裤子', '外套', '鞋子', '配饰')),
  brand VARCHAR(100),
  color VARCHAR(50),
  season VARCHAR(20),
  style VARCHAR(50),
  image_url VARCHAR(500),
  notes TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clothing_items_user_id ON public.clothing_items(user_id);
CREATE INDEX idx_clothing_items_category ON public.clothing_items(category);
CREATE INDEX idx_clothing_items_is_deleted ON public.clothing_items(is_deleted);

-- 标签表
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  "group" VARCHAR(50) DEFAULT '自定义'
);

CREATE UNIQUE INDEX idx_tags_user_name ON public.tags(user_id, name);

-- 衣物-标签关联表
CREATE TABLE public.clothing_tags (
  clothing_id UUID NOT NULL REFERENCES public.clothing_items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (clothing_id, tag_id)
);

-- 为 PostgREST 启用行安全
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clothing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clothing_tags ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能看到自己的数据
CREATE POLICY "Users can view own profiles" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profiles" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own clothing" ON public.clothing_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clothing" ON public.clothing_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clothing" ON public.clothing_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clothing" ON public.clothing_items
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tags" ON public.tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags" ON public.tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own clothing_tags" ON public.clothing_tags
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clothing_items WHERE id = clothing_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert own clothing_tags" ON public.clothing_tags
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.clothing_items WHERE id = clothing_id AND user_id = auth.uid())
  );
```

- [ ] **步骤 5：创建 `fastapi/Dockerfile`**

```dockerfile
# fastapi/Dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

- [ ] **步骤 6：创建 `fastapi/requirements.txt`**

```
fastapi==0.115.6
uvicorn[standard]==0.34.0
httpx==0.28.1
openai==1.59.3
dashscope==1.21.0
pydantic==2.10.4
python-multipart==0.0.19
```

- [ ] **步骤 7：创建 `fastapi/app/main.py` 健康检查桩**

```python
# fastapi/app/main.py
from fastapi import FastAPI

app = FastAPI(title="Wardrobe AI Service", version="1.0.0")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"service": "Wardrobe AI Service", "version": "1.0.0"}
```

- [ ] **步骤 8：创建 `nextjs/Dockerfile`**

```dockerfile
# nextjs/Dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

- [ ] **步骤 9：复制 `.env.example` 为 `.env` 并启动服务**

```bash
cp .env.example .env
docker compose up -d
```

- [ ] **步骤 10：验证所有服务健康**

```bash
curl http://localhost:8001/health          # → {"status":"ok"}
curl http://localhost:8000/auth/v1/settings # → Supabase Auth public settings
curl http://localhost:5000/status           # → Storage status
curl http://localhost:9001                  # → MinIO Console (浏览器)
docker compose ps                           # → 全部 Running
```

- [ ] **步骤 11：提交**

```bash
git add docker-compose.yml .env.example kong.yml supabase/ fastapi/ nextjs/Dockerfile
git commit -m "chore: 初始化 Docker Compose 全栈编排，含 Supabase、FastAPI、MinIO"
```

---

### Task 2: FastAPI AI 服务 — 策略模式 + 识别接口

**创建文件：**
- `fastapi/app/schemas/clothing.py`
- `fastapi/app/models/base.py`
- `fastapi/app/models/ollama.py`
- `fastapi/app/models/bailian.py`
- `fastapi/app/services/recognition.py`
- `fastapi/app/api/routes.py`
- `fastapi/app/main.py`（更新，替换桩）

**生成产物：** `POST /recognize` 接口可用，`MODEL` 环境变量切换后端

**接口：**
- 消费：无
- 产出：
  - `POST /recognize` — `request: { "image_url": "string" }` → `response: { "name", "category", "color", "season", "style", "material" }`
  - `BaseModelStrategy` 抽象类：`recognize_clothing(self, image_url: str) -> ClothingAttributes`
  - `OllamaStrategy`、`BailianStrategy` 两个具体实现
  - `RecognitionService` 根据 `MODEL` 环境变量选择策略

- [ ] **步骤 1：创建 Pydantic schemas**

```python
# fastapi/app/schemas/clothing.py
from pydantic import BaseModel


class RecognizeRequest(BaseModel):
    image_url: str


class ClothingAttributes(BaseModel):
    name: str
    category: str
    color: str
    season: str
    style: str
    material: str


class RecognizeResponse(BaseModel):
    success: bool
    data: ClothingAttributes | None = None
    error: str | None = None
```

- [ ] **步骤 2：创建策略基类**

```python
# fastapi/app/models/base.py
from abc import ABC, abstractmethod
from app.schemas.clothing import ClothingAttributes


class BaseModelStrategy(ABC):
    @abstractmethod
    async def recognize_clothing(self, image_url: str) -> ClothingAttributes:
        """分析衣物图片，返回结构化属性"""
        ...
```

- [ ] **步骤 3：创建 Ollama 适配器**

```python
# fastapi/app/models/ollama.py
import os
import json
import httpx
from app.models.base import BaseModelStrategy
from app.schemas.clothing import ClothingAttributes

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "minicpm-v:latest")

PROMPT = """你是一个专业的服饰分析师。请分析这张衣物照片，返回 JSON 格式的属性：

{
  "name": "衣物简短名称（中文）",
  "category": "上衣|裤子|外套|鞋子|配饰",
  "color": "主要颜色（中文）",
  "season": "春|夏|秋|冬|春夏|秋冬|四季",
  "style": "商务|休闲|运动|极简|工装|优雅",
  "material": "材质（中文，如纯棉、羊绒、皮革）"
}

只返回 JSON，不要包含其他文字。"""


class OllamaStrategy(BaseModelStrategy):
    async def recognize_clothing(self, image_url: str) -> ClothingAttributes:
        # 将图片下载为 base64
        async with httpx.AsyncClient(timeout=30.0) as client:
            img_resp = await client.get(image_url)
            img_resp.raise_for_status()

        import base64
        img_b64 = base64.b64encode(img_resp.content).decode("utf-8")

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{OLLAMA_HOST}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": PROMPT,
                    "images": [img_b64],
                    "stream": False,
                    "format": "json",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        # Ollama 返回的 response 字段是 JSON 字符串
        raw = json.loads(data["response"])
        return ClothingAttributes(**raw)
```

- [ ] **步骤 4：创建阿里百炼适配器**

```python
# fastapi/app/models/bailian.py
import os
import json
import httpx
from app.models.base import BaseModelStrategy
from app.schemas.clothing import ClothingAttributes

BAILIAN_API_KEY = os.getenv("BAILIAN_API_KEY", "")
BAILIAN_MODEL = os.getenv("BAILIAN_MODEL", "qwen-vl-max")

PROMPT = """你是一个专业的服饰分析师。请分析这张衣物照片，返回 JSON 格式的属性：

{
  "name": "衣物简短名称（中文）",
  "category": "上衣|裤子|外套|鞋子|配饰",
  "color": "主要颜色（中文）",
  "season": "春|夏|秋|冬|春夏|秋冬|四季",
  "style": "商务|休闲|运动|极简|工装|优雅",
  "material": "材质（中文，如纯棉、羊绒、皮革）"
}

只返回 JSON，不要包含其他文字。"""


class BailianStrategy(BaseModelStrategy):
    async def recognize_clothing(self, image_url: str) -> ClothingAttributes:
        async with httpx.AsyncClient(timeout=30.0) as client:
            img_resp = await client.get(image_url)
            img_resp.raise_for_status()

        import base64
        img_b64 = base64.b64encode(img_resp.content).decode("utf-8")
        img_data_url = f"data:image/jpeg;base64,{img_b64}"

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {BAILIAN_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": BAILIAN_MODEL,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": PROMPT},
                                {"type": "image_url", "image_url": {"url": img_data_url}},
                            ],
                        }
                    ],
                    "temperature": 0.1,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        content = data["choices"][0]["message"]["content"]
        # 清理可能的 markdown 代码块包裹
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("\n", 1)[0]
        raw = json.loads(content)
        return ClothingAttributes(**raw)
```

- [ ] **步骤 5：创建识别服务（根据环境变量选择策略）**

```python
# fastapi/app/services/recognition.py
import os
from app.models.base import BaseModelStrategy
from app.models.ollama import OllamaStrategy
from app.models.bailian import BailianStrategy
from app.schemas.clothing import ClothingAttributes


def _get_strategy() -> BaseModelStrategy:
    model = os.getenv("MODEL", "ollama")
    if model == "bailian":
        return BailianStrategy()
    return OllamaStrategy()


class RecognitionService:
    def __init__(self):
        self.strategy = _get_strategy()

    async def recognize(self, image_url: str) -> ClothingAttributes:
        return await self.strategy.recognize_clothing(image_url)
```

- [ ] **步骤 6：创建 API 路由**

```python
# fastapi/app/api/routes.py
from fastapi import APIRouter, HTTPException
from app.schemas.clothing import RecognizeRequest, RecognizeResponse
from app.services.recognition import RecognitionService

router = APIRouter()


@router.post("/recognize", response_model=RecognizeResponse)
async def recognize_clothing(req: RecognizeRequest):
    try:
        service = RecognitionService()
        attrs = await service.recognize(req.image_url)
        return RecognizeResponse(success=True, data=attrs)
    except Exception as e:
        return RecognizeResponse(success=False, error=str(e))
```

- [ ] **步骤 7：更新 `fastapi/app/main.py` 挂载路由**

```python
# fastapi/app/main.py
from fastapi import FastAPI
from app.api.routes import router

app = FastAPI(title="Wardrobe AI Service", version="1.0.0")

app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **步骤 8：构建并验证**

```bash
docker compose build fastapi
docker compose up -d fastapi
curl -X POST http://localhost:8001/recognize \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://example.com/shirt.jpg"}'
# → {"success": true, "data": {...}} 或 {"success": false, "error": "..."}
```

- [ ] **步骤 9：提交**

```bash
git add fastapi/
git commit -m "feat: 实现 FastAPI AI 识别服务，支持 Ollama 与阿里百炼策略切换"
```

---

### Task 3: Next.js 脚手架 + TypeScript 类型 + shadcn/ui 初始化

**创建文件：**
- `nextjs/package.json`
- `nextjs/tsconfig.json`
- `nextjs/next.config.ts`
- `nextjs/tailwind.config.ts`
- `nextjs/postcss.config.mjs`
- `nextjs/app/globals.css`
- `nextjs/lib/types.ts`

**修改文件：**
- `nextjs/app/layout.tsx`（初始页面桩）

**生成产物：** Next.js 开发服务器运行，shadcn/ui 组件可用

**接口：**
- 消费：无
- 产出：`ClothingItem`、`Tag`、`StatsSummary` TypeScript 类型定义，shadcn/ui 基础组件

- [ ] **步骤 1：创建 `nextjs/package.json`**

```json
{
  "name": "wardrobe-ai",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "15.1.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "2.47.12",
    "@supabase/ssr": "0.5.2",
    "minio": "8.0.2",
    "lucide-react": "0.469.0",
    "recharts": "2.15.0",
    "sonner": "1.7.1",
    "class-variance-authority": "0.7.1",
    "clsx": "2.1.1",
    "tailwind-merge": "2.6.0",
    "tailwindcss-animate": "1.0.7"
  },
  "devDependencies": {
    "@types/node": "22.10.5",
    "@types/react": "19.0.3",
    "@types/react-dom": "19.0.2",
    "typescript": "5.7.3",
    "tailwindcss": "3.4.17",
    "postcss": "8.4.49",
    "autoprefixer": "10.4.20"
  }
}
```

- [ ] **步骤 2：创建 `nextjs/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **步骤 3：创建 `nextjs/next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/wardrobe-images/**",
      },
      {
        protocol: "http",
        hostname: "minio",
        port: "9000",
        pathname: "/wardrobe-images/**",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **步骤 4：创建 Tailwind 配置**

```typescript
// nextjs/tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        border: "hsl(var(--border))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

- [ ] **步骤 5：创建 `nextjs/postcss.config.mjs`**

```javascript
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;
```

- [ ] **步骤 6：创建 `nextjs/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --border: 240 5.9% 90%;
    --radius: 0.5rem;
  }
}
```

- [ ] **步骤 7：安装依赖并初始化 shadcn/ui**

```bash
cd nextjs && npm install
npx shadcn@latest init -d
npx shadcn@latest add button card input label form select separator avatar badge dialog textarea sonner
```

- [ ] **步骤 8：创建共享类型定义**

```typescript
// nextjs/lib/types.ts
export interface ClothingItem {
  id: string;
  user_id: string;
  name: string;
  category: ClothingCategory;
  brand: string | null;
  color: string | null;
  season: string | null;
  style: string | null;
  image_url: string | null;
  notes: string | null;
  is_deleted: boolean;
  created_at: string;
  tags?: Tag[];
}

export type ClothingCategory = "上衣" | "裤子" | "外套" | "鞋子" | "配饰";

export const CLOTHING_CATEGORIES: ClothingCategory[] = [
  "上衣",
  "裤子",
  "外套",
  "鞋子",
  "配饰",
];

export const SEASONS = ["春", "夏", "秋", "冬", "春夏", "秋冬", "四季"];
export const STYLES = ["商务", "休闲", "运动", "极简", "工装", "优雅"];

export interface Tag {
  id: string;
  name: string;
  group: string;
}

export interface StatsSummary {
  total_items: number;
  new_this_month: number;
  brand_count: number;
  category_distribution: { category: string; count: number }[];
  recent_items: ClothingItem[];
}

export interface RecognizeResult {
  name: string;
  category: string;
  color: string;
  season: string;
  style: string;
  material: string;
}
```

- [ ] **步骤 9：创建 `nextjs/lib/utils.ts`（shadcn/ui 要求）**

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **步骤 10：更新 `nextjs/app/layout.tsx` 根布局**

```typescript
// nextjs/app/layout.tsx
import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wardrobe AI - AI 数字衣橱",
  description: "你的个人服饰资产管理平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
```

- [ ] **步骤 11：验证 Next.js 启动**

```bash
cd nextjs && npm run dev
curl http://localhost:3000  # → 200 OK（空页面）
```

- [ ] **步骤 12：提交**

```bash
git add nextjs/
git commit -m "chore: 初始化 Next.js 项目，配置 shadcn/ui、TailwindCSS 和共享类型"
```

---

### Task 4: Supabase 客户端 + 认证中间件

**创建文件：**
- `nextjs/lib/supabase/client.ts`
- `nextjs/lib/supabase/server.ts`
- `nextjs/middleware.ts`

**生成产物：** 浏览器和服务器端 Supabase 客户端、全局认证中间件

**接口：**
- 消费：`nextjs/lib/types.ts`
- 产出：
  - `createClient()` — 浏览器端 Supabase 客户端
  - `createServerClient()` — 服务器端 Supabase 客户端（用于 API Routes 和 Server Components）
  - `middleware.ts` — 保护 `/wardrobe/*` 和 `/settings/*` 路由，未登录重定向到 `/auth/login`

- [ ] **步骤 1：创建浏览器端 Supabase 客户端**

```typescript
// nextjs/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **步骤 2：创建服务器端 Supabase 客户端**

```typescript
// nextjs/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// 用于 API Routes 的 service role 客户端（绕过 RLS）
export async function createServiceSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

- [ ] **步骤 3：创建全局认证中间件**

```typescript
// nextjs/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 保护 wardrobe 和 settings 路由
  const protectedPaths = ["/wardrobe", "/settings"];
  const isProtected = protectedPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **步骤 4：验证中间件工作**

```bash
curl -I http://localhost:3000/wardrobe   # → 302 重定向到 /auth/login
curl -I http://localhost:3000/            # → 200 OK（首页不保护）
```

- [ ] **步骤 5：提交**

```bash
git add nextjs/lib/supabase/ nextjs/middleware.ts
git commit -m "feat: 实现 Supabase 客户端和全局认证中间件"
```

---

### Task 5: 认证页面（登录 + 注册 + 回调）

**创建文件：**
- `nextjs/app/auth/login/page.tsx`
- `nextjs/app/auth/register/page.tsx`
- `nextjs/app/auth/callback/route.ts`

**生成产物：** 用户可注册、登录、登出，认证流程完整

**接口：**
- 消费：`createClient()`、`nextjs/lib/supabase/client.ts`
- 产出：`/auth/login`、`/auth/register` 页面，`/auth/callback` 路由

- [ ] **步骤 1：创建登录页面**

```typescript
// nextjs/app/auth/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("登录成功");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">登录 Wardrobe AI</CardTitle>
          <CardDescription>欢迎回到你的数字衣橱</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">密码</Label>
                <Link href="/auth/forgot-password" className="text-sm text-muted-foreground hover:underline">
                  忘记密码？
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "登录中..." : "登录"}
            </Button>
            <p className="text-sm text-muted-foreground">
              还没有账户？{" "}
              <Link href="/auth/register" className="font-medium text-primary hover:underline">
                注册
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **步骤 2：创建注册页面**

```typescript
// nextjs/app/auth/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nickname },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("注册成功！");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">注册 Wardrobe AI</CardTitle>
          <CardDescription>开始管理你的数字衣橱</CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">昵称</Label>
              <Input
                id="nickname"
                placeholder="你的昵称"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="至少 8 个字符"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "注册中..." : "注册"}
            </Button>
            <p className="text-sm text-muted-foreground">
              已有账户？{" "}
              <Link href="/auth/login" className="font-medium text-primary hover:underline">
                登录
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **步骤 3：创建认证回调路由**

```typescript
// nextjs/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`);
}
```

- [ ] **步骤 4：提交**

```bash
git add nextjs/app/auth/
git commit -m "feat: 实现注册、登录和认证回调页面"
```

---

### Task 6: MinIO 客户端 + 图片上传 API

**创建文件：**
- `nextjs/lib/minio.ts`

**修改文件：**
- `nextjs/app/api/clothing/ai/recognize/route.ts`（此处仅创建图片上传桩，AI 调用在后续任务）

**生成产物：** 图片上传到 MinIO 并返回 URL 的能力

**接口：**
- 消费：无
- 产出：
  - `uploadImage(file: File, userId: string): Promise<string>` — 返回 MinIO 图片 URL
  - `NEXT_PUBLIC_MINIO_*` 系列环境变量

- [ ] **步骤 1：创建 MinIO 客户端**

```typescript
// nextjs/lib/minio.ts
import * as Minio from "minio";

const minioClient = new Minio.Client({
  endPoint: process.env.NEXT_PUBLIC_MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.NEXT_PUBLIC_MINIO_PORT || "9000"),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

const BUCKET = process.env.MINIO_BUCKET || "wardrobe-images";

// 确保 bucket 存在
async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET);
  if (!exists) {
    await minioClient.makeBucket(BUCKET);
    await minioClient.setBucketPolicy(
      BUCKET,
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${BUCKET}/*`],
          },
        ],
      })
    );
  }
}

export async function uploadImage(
  file: File,
  userId: string
): Promise<string> {
  await ensureBucket();

  const ext = file.name.split(".").pop() || "jpg";
  const objectName = `${userId}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await minioClient.putObject(BUCKET, objectName, buffer, buffer.length, {
    "Content-Type": file.type,
  });

  return `http://${process.env.NEXT_PUBLIC_MINIO_ENDPOINT || "localhost"}:${process.env.NEXT_PUBLIC_MINIO_PORT || "9000"}/${BUCKET}/${objectName}`;
}

export async function deleteImage(imageUrl: string): Promise<void> {
  // 从 URL 中提取 object name：http://minio:9000/bucket/userId/file.jpg → userId/file.jpg
  const url = new URL(imageUrl);
  const objectName = url.pathname.replace(`/${BUCKET}/`, "");
  await minioClient.removeObject(BUCKET, objectName);
}
```

- [ ] **步骤 2：提交**

```bash
git add nextjs/lib/minio.ts
git commit -m "feat: 实现 MinIO 图片上传客户端"
```

---

### Task 7: API Routes — 衣物 CRUD

**创建文件：**
- `nextjs/app/api/clothing/route.ts`
- `nextjs/app/api/clothing/[id]/route.ts`

**生成产物：** 衣物的增删改查 API 端点完整可用

**接口：**
- 消费：`createServerSupabase()`、`nextjs/lib/types.ts`
- 产出：
  - `GET /api/clothing` — 分页列表（query: `?page=1&search=黑色&category=上衣&tag=通勤&season=冬季`）
  - `POST /api/clothing` — 创建衣物（multipart/form-data，含图片上传）
  - `GET /api/clothing/[id]` — 单件衣物详情（含标签）
  - `PATCH /api/clothing/[id]` — 更新衣物
  - `DELETE /api/clothing/[id]` — 软删除

- [ ] **步骤 1：创建 `nextjs/app/api/clothing/route.ts`（GET 列表 + POST 创建）**

```typescript
// nextjs/app/api/clothing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/minio";

// GET /api/clothing?page=1&search=黑色&category=上衣&tag=通勤&season=冬季
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const tag = searchParams.get("tag") || "";
  const season = searchParams.get("season") || "";
  const pageSize = 20;

  let query = supabase
    .from("clothing_items")
    .select("*, clothing_tags!inner(tag_id, tags!inner(id, name, group))", {
      count: "exact",
    })
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }
  if (category) {
    query = query.eq("category", category);
  }
  if (season) {
    query = query.eq("season", season);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 扁平化 clothing_tags
  const items = data?.map((item: any) => ({
    ...item,
    tags: item.clothing_tags?.map((ct: any) => ct.tags) || [],
    clothing_tags: undefined,
  })) || [];

  return NextResponse.json({
    items,
    total: count || 0,
    page,
    pageSize,
    hasMore: (count || 0) > page * pageSize,
  });
}

// POST /api/clothing
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const formData = await request.formData();
  const imageFile = formData.get("image") as File | null;
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const brand = formData.get("brand") as string | null;
  const color = formData.get("color") as string | null;
  const season = formData.get("season") as string | null;
  const style = formData.get("style") as string | null;
  const notes = formData.get("notes") as string | null;
  const tagIds = JSON.parse((formData.get("tag_ids") as string) || "[]") as string[];

  if (!name || !category) {
    return NextResponse.json(
      { error: "名称和分类为必填项" },
      { status: 400 }
    );
  }

  // 上传图片到 MinIO
  let imageUrl: string | null = null;
  if (imageFile && imageFile.size > 0) {
    imageUrl = await uploadImage(imageFile, user.id);
  }

  // 创建衣物
  const { data: item, error } = await supabase
    .from("clothing_items")
    .insert({
      user_id: user.id,
      name,
      category,
      brand: brand || null,
      color: color || null,
      season: season || null,
      style: style || null,
      image_url: imageUrl,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 关联标签
  if (tagIds.length > 0) {
    const clothingTags = tagIds.map((tagId) => ({
      clothing_id: item.id,
      tag_id: tagId,
    }));
    await supabase.from("clothing_tags").insert(clothingTags);
  }

  return NextResponse.json({ item }, { status: 201 });
}
```

- [ ] **步骤 2：创建 `nextjs/app/api/clothing/[id]/route.ts`（GET / PATCH / DELETE 单件）**

```typescript
// nextjs/app/api/clothing/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { uploadImage, deleteImage } from "@/lib/minio";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  const { data: item, error } = await supabase
    .from("clothing_items")
    .select("*, clothing_tags(tag_id, tags(id, name, group))")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !item) {
    return NextResponse.json({ error: "衣物不存在" }, { status: 404 });
  }

  const tags = item.clothing_tags?.map((ct: any) => ct.tags) || [];
  return NextResponse.json({ ...item, tags, clothing_tags: undefined });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  // 检查所有权
  const { data: existing } = await supabase
    .from("clothing_items")
    .select("id, image_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "衣物不存在" }, { status: 404 });
  }

  const formData = await request.formData();
  const updates: Record<string, any> = {};

  for (const key of ["name", "category", "brand", "color", "season", "style", "notes"]) {
    if (formData.has(key)) {
      updates[key] = formData.get(key) || null;
    }
  }

  // 更新图片
  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    if (existing.image_url) {
      await deleteImage(existing.image_url).catch(() => {});
    }
    updates.image_url = await uploadImage(imageFile, user.id);
  }

  const { data: item, error } = await supabase
    .from("clothing_items")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 更新标签
  const tagIds = formData.get("tag_ids");
  if (tagIds !== null) {
    const parsed = JSON.parse(tagIds as string) as string[];
    await supabase.from("clothing_tags").delete().eq("clothing_id", id);
    if (parsed.length > 0) {
      await supabase.from("clothing_tags").insert(
        parsed.map((tagId) => ({ clothing_id: id, tag_id: tagId }))
      );
    }
  }

  return NextResponse.json({ item });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase
    .from("clothing_items")
    .update({ is_deleted: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **步骤 3：提交**

```bash
git add nextjs/app/api/clothing/
git commit -m "feat: 实现衣物 CRUD API 端点（列表、创建、详情、更新、软删除）"
```

---

### Task 8: API Routes — 标签 + 统计 + AI 识别桥接

**创建文件：**
- `nextjs/app/api/tags/route.ts`
- `nextjs/app/api/stats/summary/route.ts`
- `nextjs/lib/ai-client.ts`
- `nextjs/app/api/clothing/ai/recognize/route.ts`

**生成产物：** 标签 API、统计 API、FastAPI 间的 AI 识别桥接

**接口：**
- 消费：`createServerSupabase()`、FastAPI `/recognize`
- 产出：
  - `GET /api/tags`、`POST /api/tags`
  - `GET /api/stats/summary`
  - `POST /api/clothing/ai/recognize` — 上传图片 → 转发 FastAPI → 返回识别结果

- [ ] **步骤 1：创建标签 API**

```typescript
// nextjs/app/api/tags/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", user.id)
    .order("group")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tags: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { name, group } = await request.json();

  if (!name) {
    return NextResponse.json({ error: "标签名称为必填项" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tags")
    .insert({ user_id: user.id, name, group: group || "自定义" })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "标签已存在" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tag: data }, { status: 201 });
}
```

- [ ] **步骤 2：创建统计 API**

```typescript
// nextjs/app/api/stats/summary/route.ts
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  // 总数
  const { count: totalItems } = await supabase
    .from("clothing_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_deleted", false);

  // 本月新增
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { count: newThisMonth } = await supabase
    .from("clothing_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .gte("created_at", startOfMonth.toISOString());

  // 品牌数
  const { data: brandData } = await supabase
    .from("clothing_items")
    .select("brand")
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .not("brand", "is", null);

  const uniqueBrands = new Set(brandData?.map((b) => b.brand));
  const brandCount = uniqueBrands.size;

  // 分类占比
  const { data: categoryData } = await supabase
    .from("clothing_items")
    .select("category")
    .eq("user_id", user.id)
    .eq("is_deleted", false);

  const categoryMap: Record<string, number> = {};
  categoryData?.forEach((item) => {
    categoryMap[item.category] = (categoryMap[item.category] || 0) + 1;
  });
  const categoryDistribution = Object.entries(categoryMap).map(
    ([category, count]) => ({ category, count })
  );

  // 最近新增
  const { data: recentItems } = await supabase
    .from("clothing_items")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    total_items: totalItems || 0,
    new_this_month: newThisMonth || 0,
    brand_count: brandCount,
    category_distribution: categoryDistribution,
    recent_items: recentItems || [],
  });
}
```

- [ ] **步骤 3：创建 AI 客户端（桥接 FastAPI）**

```typescript
// nextjs/lib/ai-client.ts
import type { RecognizeResult } from "@/lib/types";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8001";

export async function recognizeClothing(
  imageUrl: string
): Promise<RecognizeResult> {
  const resp = await fetch(`${FASTAPI_URL}/recognize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl }),
  });

  const data = await resp.json();

  if (!data.success) {
    throw new Error(data.error || "AI 识别失败");
  }

  return data.data as RecognizeResult;
}
```

- [ ] **步骤 4：创建 AI 识别 API Route**

```typescript
// nextjs/app/api/clothing/ai/recognize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/minio";
import { recognizeClothing } from "@/lib/ai-client";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const formData = await request.formData();
  const imageFile = formData.get("image") as File;

  if (!imageFile || imageFile.size === 0) {
    return NextResponse.json({ error: "请上传图片" }, { status: 400 });
  }

  try {
    // 先上传到 MinIO
    const imageUrl = await uploadImage(imageFile, user.id);

    // 调用 FastAPI AI 识别
    const result = await recognizeClothing(imageUrl);

    return NextResponse.json({
      success: true,
      data: result,
      image_url: imageUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

- [ ] **步骤 5：提交**

```bash
git add nextjs/app/api/tags/ nextjs/app/api/stats/ nextjs/lib/ai-client.ts nextjs/app/api/clothing/ai/
git commit -m "feat: 实现标签 API、统计 API 和 AI 识别桥接端点"
```

---

### Task 9: 布局组件（导航栏 + 侧边栏）

**创建文件：**
- `nextjs/components/layout/Navbar.tsx`
- `nextjs/components/layout/Sidebar.tsx`
- `nextjs/app/(authenticated)/layout.tsx`

**修改文件：**
- `nextjs/app/layout.tsx`（调整结构，包裹认证布局）

**生成产物：** 认证后页面的全局导航框架

**接口：**
- 消费：`createClient()`（Supabase 客户端，用于登出）
- 产出：`Navbar`、`Sidebar` 组件，`(authenticated)` 路由组布局

- [ ] **步骤 1：创建认证布局路由组**

```bash
mkdir -p "nextjs/app/(authenticated)"
```

- [ ] **步骤 2：创建导航栏**

```typescript
// nextjs/components/layout/Navbar.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function Navbar() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("已退出登录");
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">👗</span>
            <span className="font-semibold text-lg">Wardrobe AI</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-4">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            仪表盘
          </Link>
          <Link href="/wardrobe" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            我的衣柜
          </Link>
          <Link href="/wardrobe/add" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            新增衣物
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="md:hidden">
            <Link href="/wardrobe/add">+</Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/settings">设置</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **步骤 3：创建侧边栏**

```typescript
// nextjs/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Shirt, PlusCircle, Settings, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/wardrobe", label: "我的衣柜", icon: Shirt },
  { href: "/wardrobe/add", label: "新增衣物", icon: PlusCircle },
  { href: "/settings", label: "设置", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-56 border-r bg-background pt-4">
      <nav className="flex flex-col gap-1 px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Button
              key={href}
              variant={isActive ? "secondary" : "ghost"}
              className={cn("justify-start gap-2", isActive && "font-medium")}
              asChild
            >
              <Link href={href}>
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **步骤 4：创建认证布局**

```typescript
// nextjs/app/(authenticated)/layout.tsx
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **步骤 5：更新根布局（添加页面组件）**

```typescript
// nextjs/app/layout.tsx
import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wardrobe AI - AI 数字衣橱",
  description: "你的个人服饰资产管理平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
```

- [ ] **步骤 6：提交**

```bash
git add nextjs/components/layout/ nextjs/app/\(authenticated\)/ nextjs/app/layout.tsx
git commit -m "feat: 实现导航栏、侧边栏和认证布局框架"
```

---

### Task 10: 衣柜组件（卡片、网格、搜索栏、表单、上传区、AI 面板）

**创建文件：**
- `nextjs/components/wardrobe/ClothingCard.tsx`
- `nextjs/components/wardrobe/ClothingGrid.tsx`
- `nextjs/components/wardrobe/SearchBar.tsx`
- `nextjs/components/wardrobe/UploadZone.tsx`
- `nextjs/components/wardrobe/AIRecognitionPanel.tsx`
- `nextjs/components/wardrobe/ClothingForm.tsx`

**生成产物：** 衣柜页面所需的全套 UI 组件

**接口：**
- 消费：`ClothingItem`、`ClothingCategory`、`RecognizeResult` 类型，`createClient()`
- 产出：6 个可组合的衣柜 UI 组件

- [ ] **步骤 1：创建 ClothingCard**

```typescript
// nextjs/components/wardrobe/ClothingCard.tsx
import Link from "next/link";
import Image from "next/image";
import { Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ClothingItem } from "@/lib/types";

const FALLBACK_IMAGE = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjMyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmNWY5Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5NGEzYjgiIGZvbnQtc2l6ZT0iMTgiPuaCoeeJqTxhbnN0PnB1PC9hbnN0PjwvdGV4dD48L3N2Zz4=";

export function ClothingCard({ item }: { item: ClothingItem }) {
  return (
    <Card className="group overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/wardrobe/${item.id}`}>
        <div className="aspect-square relative bg-muted">
          <Image
            src={item.image_url || FALLBACK_IMAGE}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </div>
      </Link>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.category}</p>
          </div>
        </div>
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.slice(0, 3).map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **步骤 2：创建 ClothingGrid**

```typescript
// nextjs/components/wardrobe/ClothingGrid.tsx
import { ClothingCard } from "./ClothingCard";
import type { ClothingItem } from "@/lib/types";

export function ClothingGrid({ items }: { items: ClothingItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-6xl mb-4">👔</p>
        <p className="text-lg font-medium">衣柜还是空的</p>
        <p className="text-sm">快去添加你的第一件衣物吧</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {items.map((item) => (
        <ClothingCard key={item.id} item={item} />
      ))}
    </div>
  );
}
```

- [ ] **步骤 3：创建 SearchBar**

```typescript
// nextjs/components/wardrobe/SearchBar.tsx
"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CLOTHING_CATEGORIES, SEASONS } from "@/lib/types";

interface SearchFilters {
  search: string;
  category: string;
  season: string;
}

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [season, setSeason] = useState("");

  function triggerSearch(newSearch?: string, newCategory?: string, newSeason?: string) {
    onSearch({
      search: newSearch ?? search,
      category: newCategory ?? category,
      season: newSeason ?? season,
    });
  }

  function clearAll() {
    setSearch("");
    setCategory("");
    setSeason("");
    onSearch({ search: "", category: "", season: "" });
  }

  const hasFilters = search || category || season;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索衣物..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              triggerSearch(e.target.value);
            }}
          />
        </div>
        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v === "all" ? "" : v);
            triggerSearch(undefined, v === "all" ? "" : v);
          }}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {CLOTHING_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={season}
          onValueChange={(v) => {
            setSeason(v === "all" ? "" : v);
            triggerSearch(undefined, undefined, v === "all" ? "" : v);
          }}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="季节" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部季节</SelectItem>
            {SEASONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={clearAll}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **步骤 4：创建 UploadZone**

```typescript
// nextjs/components/wardrobe/UploadZone.tsx
"use client";

import { useState, useCallback } from "react";
import { Upload, Camera } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onImageSelected: (file: File) => void;
  currentImage?: string | null;
}

export function UploadZone({ onImageSelected, currentImage }: UploadZoneProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    onImageSelected(file);
    setPreview(URL.createObjectURL(file));
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50",
        preview && "p-0 border-none"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => document.getElementById("file-input")?.click()}
    >
      {preview ? (
        <div className="relative aspect-square rounded-lg overflow-hidden">
          <Image
            src={preview}
            alt="预览"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-3 right-3"
            onClick={(e) => {
              e.stopPropagation();
              document.getElementById("file-input")?.click();
            }}
          >
            更换图片
          </Button>
        </div>
      ) : (
        <>
          <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">拖拽图片到此处或点击上传</p>
          <p className="text-xs text-muted-foreground mt-1">
            JPG、PNG、WebP，最大 10MB
          </p>
          <div className="flex gap-2 justify-center mt-4">
            <Button variant="outline" size="sm" type="button">
              <Upload className="mr-2 h-4 w-4" />
              选择文件
            </Button>
            <Button variant="outline" size="sm" type="button"
              onClick={(e) => { e.stopPropagation(); /* camera API */ }}>
              <Camera className="mr-2 h-4 w-4" />
              拍照
            </Button>
          </div>
        </>
      )}
      <input
        id="file-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
```

- [ ] **步骤 5：创建 AIRecognitionPanel**

```typescript
// nextjs/components/wardrobe/AIRecognitionPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { RecognizeResult } from "@/lib/types";

type Step = "idle" | "uploading" | "recognizing" | "done" | "error";

interface AIRecognitionPanelProps {
  file: File | null;
  onResult: (result: RecognizeResult, imageUrl: string) => void;
}

export function AIRecognitionPanel({ file, onResult }: AIRecognitionPanelProps) {
  const [step, setStep] = useState<Step>("idle");
  const [fields, setFields] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) {
      setStep("idle");
      setFields([]);
      return;
    }

    async function run() {
      setStep("uploading");
      setFields(["上传图片中..."]);

      try {
        const supabase = createClient();
        const formData = new FormData();
        formData.append("image", file);

        setStep("recognizing");
        setFields(["AI 正在分析图片..."]);

        const resp = await fetch("/api/clothing/ai/recognize", {
          method: "POST",
          body: formData,
        });

        const data = await resp.json();

        if (!data.success) {
          throw new Error(data.error);
        }

        // 逐个展示识别结果
        const result = data.data as RecognizeResult;
        const revealFields = [
          `分类：${result.category}`,
          `颜色：${result.color}`,
          `风格：${result.style}`,
          `季节：${result.season}`,
        ];

        for (let i = 0; i < revealFields.length; i++) {
          await new Promise((r) => setTimeout(r, 400));
          setFields((prev) => [...prev, revealFields[i]]);
        }

        await new Promise((r) => setTimeout(r, 300));
        setStep("done");
        onResult(result, data.image_url);
      } catch (err: any) {
        setStep("error");
        setError(err.message || "识别失败，请重试");
      }
    }

    run();
  }, [file]);

  if (step === "idle") return null;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        {step === "recognizing" && (
          <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
        )}
        {step === "done" && (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        )}
        {step === "error" && (
          <span className="text-red-500 text-sm font-medium">识别失败</span>
        )}
        <span className="text-sm font-medium">
          {step === "uploading" && "上传中..."}
          {step === "recognizing" && "AI 正在识别..."}
          {step === "done" && "识别完成！"}
        </span>
      </div>

      <div className="space-y-1.5">
        {fields.map((field, i) => (
          <div
            key={i}
            className="text-sm text-muted-foreground animate-in fade-in slide-in-from-left-2"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {field}
          </div>
        ))}
        {step === "recognizing" && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-1" />
        )}
      </div>

      {step === "error" && (
        <p className="text-sm text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
}
```

- [ ] **步骤 6：创建 ClothingForm**

```typescript
// nextjs/components/wardrobe/ClothingForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CLOTHING_CATEGORIES, SEASONS, STYLES } from "@/lib/types";
import type { ClothingItem, RecognizeResult } from "@/lib/types";

interface ClothingFormProps {
  item?: ClothingItem;                    // 编辑模式时传入
  aiResult?: RecognizeResult;
  aiImageUrl?: string;
  isSubmitting?: boolean;
  onSubmit: (formData: FormData) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function ClothingForm({
  item,
  aiResult,
  aiImageUrl,
  isSubmitting,
  onSubmit,
  onDelete,
}: ClothingFormProps) {
  const [name, setName] = useState(item?.name || aiResult?.name || "");
  const [category, setCategory] = useState(item?.category || aiResult?.category || "");
  const [brand, setBrand] = useState(item?.brand || "");
  const [color, setColor] = useState(item?.color || aiResult?.color || "");
  const [season, setSeason] = useState(item?.season || aiResult?.season || "");
  const [style, setStyle] = useState(item?.style || aiResult?.style || "");
  const [notes, setNotes] = useState(item?.notes || "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !category) {
      toast.error("请填写名称和分类");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("category", category);
    if (brand) formData.append("brand", brand);
    if (color) formData.append("color", color);
    if (season) formData.append("season", season);
    if (style) formData.append("style", style);
    if (notes) formData.append("notes", notes);

    // 编辑模式：传已有图片 URL
    if (item && item.image_url) {
      formData.append("image_url", item.image_url);
    }
    if (aiImageUrl) {
      formData.append("image_url", aiImageUrl);
    }

    await onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">名称 *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：黑色羊绒大衣"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">分类 *</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="选择分类" />
            </SelectTrigger>
            <SelectContent>
              {CLOTHING_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="brand">品牌</Label>
          <Input
            id="brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="如：优衣库"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">颜色</Label>
          <Input
            id="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="如：黑色"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="season">季节</Label>
          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger>
              <SelectValue placeholder="选择季节" />
            </SelectTrigger>
            <SelectContent>
              {SEASONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="style">风格</Label>
          <Select value={style} onValueChange={setStyle}>
            <SelectTrigger>
              <SelectValue placeholder="选择风格" />
            </SelectTrigger>
            <SelectContent>
              {STYLES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">备注</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="如：去年圣诞节购入，版型偏大"
          rows={3}
        />
      </div>

      <div className="flex justify-between">
        <div>
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={async () => {
                if (confirm("确定要删除这件衣物吗？")) {
                  await onDelete();
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </Button>
          )}
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : item ? "保存修改" : "保存衣物"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **步骤 7：提交**

```bash
git add nextjs/components/wardrobe/
git commit -m "feat: 实现衣柜卡片、网格、搜索栏、上传区、AI 面板和表单组件"
```

---

### Task 11: 页面 — 仪表盘首页

**创建文件：**
- `nextjs/components/dashboard/StatCard.tsx`
- `nextjs/components/dashboard/CategoryPieChart.tsx`
- `nextjs/components/dashboard/RecentItems.tsx`
- `nextjs/app/(authenticated)/page.tsx`

**生成产物：** 带统计卡片、饼图和最近新增列表的仪表盘首页

**接口：**
- 消费：`GET /api/stats/summary`、`StatsSummary` 类型
- 产出：`/` 路由的完整仪表盘页面

- [ ] **步骤 1：创建 StatCard 组件**

```typescript
// nextjs/components/dashboard/StatCard.tsx
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
}

export function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **步骤 2：创建 CategoryPieChart 组件**

```typescript
// nextjs/components/dashboard/CategoryPieChart.tsx
"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981"];

interface CategoryPieChartProps {
  data: { category: string; count: number }[];
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">分类占比</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            暂无数据
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">分类占比</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ category, count }) => `${category} ${count}`}
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **步骤 3：创建 RecentItems 组件**

```typescript
// nextjs/components/dashboard/RecentItems.tsx
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import type { ClothingItem } from "@/lib/types";

const FALLBACK = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2YxZjVmOSIvPjwvc3ZnPg==";

export function RecentItems({ items }: { items: ClothingItem[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">最近新增</CardTitle>
        <Link
          href="/wardrobe"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          查看全部 <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            还没有衣物，去添加第一件吧
          </p>
        ) : (
          <div className="space-y-3">
            {items.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={`/wardrobe/${item.id}`}
                className="flex items-center gap-3 hover:bg-muted/50 rounded-md p-1 -mx-1 transition-colors"
              >
                <Image
                  src={item.image_url || FALLBACK}
                  alt={item.name}
                  width={40}
                  height={40}
                  className="rounded-md object-cover aspect-square"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {item.category}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **步骤 4：创建仪表盘首页**

```typescript
// nextjs/app/(authenticated)/page.tsx
import { Shirt, CalendarPlus, Tag } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/StatCard";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { RecentItems } from "@/components/dashboard/RecentItems";

export default async function DashboardPage() {
  const supabase = await createServerSupabase();

  // 统计查询
  const { count: totalItems } = await supabase
    .from("clothing_items")
    .select("*", { count: "exact", head: true })
    .eq("is_deleted", false);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { count: newThisMonth } = await supabase
    .from("clothing_items")
    .select("*", { count: "exact", head: true })
    .eq("is_deleted", false)
    .gte("created_at", startOfMonth.toISOString());

  const { data: brandData } = await supabase
    .from("clothing_items")
    .select("brand")
    .eq("is_deleted", false)
    .not("brand", "is", null);
  const uniqueBrands = new Set(brandData?.map((b) => b.brand));

  const { data: categoryData } = await supabase
    .from("clothing_items")
    .select("category")
    .eq("is_deleted", false);
  const categoryMap: Record<string, number> = {};
  categoryData?.forEach((item) => {
    categoryMap[item.category] = (categoryMap[item.category] || 0) + 1;
  });
  const categoryDistribution = Object.entries(categoryMap).map(
    ([category, count]) => ({ category, count })
  );

  const { data: recentItems } = await supabase
    .from("clothing_items")
    .select("*")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">仪表盘</h1>
        <p className="text-muted-foreground">你的衣橱数据概览</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="衣物总数"
          value={totalItems || 0}
          icon={Shirt}
        />
        <StatCard
          title="本月新增"
          value={newThisMonth || 0}
          icon={CalendarPlus}
        />
        <StatCard
          title="品牌数"
          value={uniqueBrands.size}
          icon={Tag}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CategoryPieChart data={categoryDistribution} />
        </div>
        <div className="lg:col-span-2">
          <RecentItems items={recentItems || []} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 5：提交**

```bash
git add nextjs/components/dashboard/ nextjs/app/\(authenticated\)/page.tsx
git commit -m "feat: 实现仪表盘首页，含统计卡片、分类饼图和最近新增列表"
```

---

### Task 12: 页面 — 衣柜列表 + 新增 + 详情 + 编辑

**创建文件：**
- `nextjs/app/(authenticated)/wardrobe/page.tsx`
- `nextjs/app/(authenticated)/wardrobe/add/page.tsx`
- `nextjs/app/(authenticated)/wardrobe/[id]/page.tsx`
- `nextjs/app/(authenticated)/wardrobe/[id]/edit/page.tsx`

**生成产物：** 衣柜模块的四个完整页面

**接口：**
- 消费：`GET/POST/PATCH/DELETE /api/clothing`、`UploadZone`、`AIRecognitionPanel`、`ClothingForm`、`SearchBar`、`ClothingGrid`
- 产出：`/wardrobe`、`/wardrobe/add`、`/wardrobe/[id]`、`/wardrobe/[id]/edit`

- [ ] **步骤 1：创建衣柜列表页**

```typescript
// nextjs/app/(authenticated)/wardrobe/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/wardrobe/SearchBar";
import { ClothingGrid } from "@/components/wardrobe/ClothingGrid";
import type { ClothingItem } from "@/lib/types";

export default function WardrobeListPage() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState({ search: "", category: "", season: "" });
  const router = useRouter();

  useEffect(() => {
    async function fetchItems() {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      if (filters.search) params.set("search", filters.search);
      if (filters.category) params.set("category", filters.category);
      if (filters.season) params.set("season", filters.season);

      const resp = await fetch(`/api/clothing?${params}`);
      const data = await resp.json();

      if (data.items) {
        setItems(page === 1 ? data.items : [...items, ...data.items]);
        setHasMore(data.hasMore);
      }
      setLoading(false);
    }

    fetchItems();
  }, [page, filters]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">我的衣柜</h1>
          <p className="text-muted-foreground">管理你的所有衣物</p>
        </div>
        <Button asChild>
          <a href="/wardrobe/add">
            <Plus className="mr-2 h-4 w-4" />
            新增衣物
          </a>
        </Button>
      </div>

      <SearchBar
        onSearch={(f) => {
          setFilters(f);
          setPage(1);
        }}
      />

      {loading ? (
        <p className="text-center py-10 text-muted-foreground">加载中...</p>
      ) : (
        <>
          <ClothingGrid items={items} />
          {hasMore && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
              >
                加载更多
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **步骤 2：创建新增衣物页**

```typescript
// nextjs/app/(authenticated)/wardrobe/add/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadZone } from "@/components/wardrobe/UploadZone";
import { AIRecognitionPanel } from "@/components/wardrobe/AIRecognitionPanel";
import { ClothingForm } from "@/components/wardrobe/ClothingForm";
import { toast } from "sonner";
import type { RecognizeResult } from "@/lib/types";

export default function AddClothingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [aiResult, setAiResult] = useState<RecognizeResult | undefined>();
  const [aiImageUrl, setAiImageUrl] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    if (file) formData.append("image", file);
    if (aiImageUrl) formData.append("image_url", aiImageUrl);

    const resp = await fetch("/api/clothing", {
      method: "POST",
      body: formData,
    });

    const data = await resp.json();

    if (resp.ok) {
      toast.success("衣物已保存！");
      router.push(`/wardrobe/${data.item.id}`);
    } else {
      toast.error(data.error || "保存失败");
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">新增衣物</h1>
        <p className="text-muted-foreground">上传照片，AI 帮你自动识别信息</p>
      </div>

      <UploadZone
        onImageSelected={setFile}
        currentImage={aiImageUrl}
      />

      {file && (
        <AIRecognitionPanel
          file={file}
          onResult={(result, url) => {
            setAiResult(result);
            setAiImageUrl(url);
          }}
        />
      )}

      <ClothingForm
        aiResult={aiResult}
        aiImageUrl={aiImageUrl}
        isSubmitting={submitting}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
```

- [ ] **步骤 3：创建衣物详情页**

```typescript
// nextjs/app/(authenticated)/wardrobe/[id]/page.tsx
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FALLBACK = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmNWY5Ii8+PC9zdmc+";

export default async function ClothingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const { data: item, error } = await supabase
    .from("clothing_items")
    .select("*, clothing_tags(tag_id, tags(id, name, group))")
    .eq("id", id)
    .eq("is_deleted", false)
    .single();

  if (error || !item) {
    notFound();
  }

  const tags = item.clothing_tags?.map((ct: any) => ct.tags) || [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{item.name}</h1>
          <p className="text-muted-foreground">{item.category}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/wardrobe/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              编辑
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
          <Image
            src={item.image_url || FALLBACK}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">衣物信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <InfoRow label="分类" value={item.category} />
              <InfoRow label="品牌" value={item.brand} />
              <InfoRow label="颜色" value={item.color} />
              <InfoRow label="季节" value={item.season} />
              <InfoRow label="风格" value={item.style} />
              <InfoRow label="备注" value={item.notes} />
            </CardContent>
          </Card>

          {tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">标签</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: any) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
```

- [ ] **步骤 4：创建编辑衣物页**

```typescript
// nextjs/app/(authenticated)/wardrobe/[id]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { UploadZone } from "@/components/wardrobe/UploadZone";
import { AIRecognitionPanel } from "@/components/wardrobe/AIRecognitionPanel";
import { ClothingForm } from "@/components/wardrobe/ClothingForm";
import { toast } from "sonner";
import type { ClothingItem } from "@/lib/types";

export default function EditClothingPage() {
  const [item, setItem] = useState<ClothingItem | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    fetch(`/api/clothing/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          toast.error("衣物不存在");
          router.push("/wardrobe");
          return;
        }
        setItem(data);
      })
      .catch(() => toast.error("加载失败"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    if (file) formData.append("image", file);

    const resp = await fetch(`/api/clothing/${id}`, {
      method: "PATCH",
      body: formData,
    });

    if (resp.ok) {
      toast.success("已保存修改");
      router.push(`/wardrobe/${id}`);
    } else {
      const data = await resp.json();
      toast.error(data.error || "保存失败");
    }
    setSubmitting(false);
  }

  async function handleDelete() {
    const resp = await fetch(`/api/clothing/${id}`, { method: "DELETE" });
    if (resp.ok) {
      toast.success("已删除");
      router.push("/wardrobe");
    } else {
      toast.error("删除失败");
    }
  }

  if (loading) {
    return <p className="text-center py-10 text-muted-foreground">加载中...</p>;
  }

  if (!item) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">编辑衣物</h1>
        <p className="text-muted-foreground">修改 {item.name}</p>
      </div>

      <UploadZone
        onImageSelected={setFile}
        currentImage={item.image_url}
      />

      <ClothingForm
        item={item}
        isSubmitting={submitting}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />
    </div>
  );
}
```

- [ ] **步骤 5：提交**

```bash
git add nextjs/app/\(authenticated\)/wardrobe/
git commit -m "feat: 实现衣柜列表、新增、详情和编辑页面"
```

---

### Task 13: 设置页面

**创建文件：**
- `nextjs/app/(authenticated)/settings/page.tsx`
- `nextjs/app/api/auth/me/route.ts`
- `nextjs/app/api/auth/profile/route.ts`

**生成产物：** 用户资料编辑和密码修改功能

**接口：**
- 消费：`GET /api/auth/me`、`PATCH /api/auth/profile`
- 产出：`/settings` 页面

- [ ] **步骤 1：创建认证用户 API**

```typescript
// nextjs/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    id: user.id,
    email: user.email,
    nickname: profile?.nickname || user.user_metadata?.nickname || "",
    avatar_url: profile?.avatar_url || "",
    created_at: user.created_at,
  });
}
```

```typescript
// nextjs/app/api/auth/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { nickname } = await request.json();

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      nickname: nickname || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **步骤 2：创建设置页**

```typescript
// nextjs/app/(authenticated)/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function SettingsPage() {
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setNickname(data.nickname || "");
        setEmail(data.email || "");
      });
  }, []);

  async function handleSaveProfile() {
    setSaving(true);
    const resp = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    if (resp.ok) {
      toast.success("资料已更新");
    } else {
      toast.error("更新失败");
    }
    setSaving(false);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-muted-foreground">管理你的账户信息</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>个人资料</CardTitle>
          <CardDescription>更新你的昵称</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" value={email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nickname">昵称</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="你的昵称"
            />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **步骤 3：提交**

```bash
git add nextjs/app/\(authenticated\)/settings/ nextjs/app/api/auth/
git commit -m "feat: 实现设置页面、用户资料 API"
```

---

### Task 14: 集成验证与收尾

**生成产物：** 端到端验证完整流程、bug 修复、README

- [ ] **步骤 1：启动全部服务**

```bash
docker compose down -v   # 清空旧数据
docker compose up -d
```

- [ ] **步骤 2：验证认证流程**

```bash
# 注册
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'

# 应该能通过浏览器访问 /auth/login 并手动登录
# 验证登录后重定向到 /
```

- [ ] **步骤 3：验证衣物 CRUD 流程**

```bash
# 需要先在浏览器登录获取 cookie，然后测试 API

# 创建衣物
curl -X POST http://localhost:3000/api/clothing \
  -H "Content-Type: application/json" \
  -d '{"name":"测试衬衫","category":"上衣","color":"白色","brand":"优衣库"}'

# 列表查询
curl http://localhost:3000/api/clothing?page=1

# 统计查询
curl http://localhost:3000/api/stats/summary
```

- [ ] **步骤 4：验证 AI 识别流程**

```bash
# 使用测试图片，先上传到 MinIO，再调用 AI 识别
# 通过浏览器访问 /wardrobe/add，上传一张衣物图片，观察 AI 识别过程
```

- [ ] **步骤 5：创建 README.md**

```markdown
# Wardrobe AI — AI 数字衣橱

个人服饰资产管理平台 MVP。

## 技术栈

- **前端**: Next.js 15 (App Router) + shadcn/ui + TailwindCSS
- **后端**: Next.js API Routes (BFF) + Python FastAPI (AI 服务)
- **数据**: Supabase 自托管 (Auth + PostgreSQL)
- **存储**: MinIO (S3 兼容)
- **AI**: Ollama (本地调试) / 阿里百炼 (生产)
- **编排**: Docker Compose

## 快速开始

1. 复制环境变量:

```bash
cp .env.example .env
```

2. 编辑 `.env`，填入阿里百炼 API Key（如需生产级 AI 识别）

3. 启动全部服务:

```bash
docker compose up -d
```

4. 访问 http://localhost:3000

5. 安装 shadcn/ui 组件（首次运行或新增组件时）:

```bash
cd nextjs && npx shadcn@latest add button card input label ...
```

## 服务端口

| 服务 | 端口 |
|------|------|
| Next.js | 3000 |
| Supabase (Kong) | 8000 |
| FastAPI | 8001 |
| MinIO API | 9000 |
| MinIO Console | 9001 |

## 开发指南

- Next.js 代码在 `nextjs/`，修改后容器自动热重载
- FastAPI 代码在 `fastapi/`，使用 `--reload` 自动重启
- 数据库迁移在 `supabase/migrations/`，启动时自动执行
- 环境变量在 `.env` 中修改，`docker compose restart` 生效
```

- [ ] **步骤 6：提交**

```bash
git add README.md
git commit -m "docs: 添加项目 README 和快速开始指南"
```

- [ ] **步骤 7：最终验证提交**

```bash
git add -A
git commit -m "chore: 集成验证和收尾调整"
```

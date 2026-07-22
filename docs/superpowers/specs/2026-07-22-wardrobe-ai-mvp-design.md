# Wardrobe AI MVP 设计文档

2026-07-22

## 1. 产品概述

Wardrobe AI（AI数字衣橱）是一款 AI Native 个人服饰资产管理平台。MVP 阶段的核心目标是验证用户是否愿意长期维护数字衣柜。

### 1.1 MVP 核心能力

- 用户注册/登录
- 衣物录入（手动 + 图片上传 + AI 自动识别）
- 分类管理与多维标签
- 搜索与多条件筛选
- 首页数据统计仪表盘

### 1.2 排除范围

AI虚拟试衣、电商订单同步、AI购物助手、社区分享、穿搭日历、穿着频率统计。

---

## 2. 技术架构

### 2.1 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 前端 + BFF | Next.js (App Router) + shadcn/ui + TailwindCSS | 前后端一体，AI 生态成熟 |
| 认证 + 数据库 + 存储 | Supabase 自托管 (Docker) | 零外部依赖，Free Tier 无花费 |
| AI 服务 | Python FastAPI (Docker) | 独立服务，后续可扩展 |
| AI 模型 | Ollama (本地调试) / 阿里百炼 (生产) | 策略模式切换，MacBook Air 可用 |
| 文件存储 | MinIO (Docker) | S3 兼容，架构与线上一致 |
| 容器编排 | Docker Compose | 本地全栈一键启动 |

### 2.2 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
│                                                          │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Next.js    │  │   FastAPI    │  │   Supabase     │  │
│  │  (App Rtr) │──│  (AI 服务)   │  │   (自托管)     │  │
│  │            │  │              │  │   ├ Kong       │  │
│  │  BFF       │  │  Ollama      │  │   ├ PostgreSQL  │  │
│  │  SSR       │  │  百炼 API    │  │   ├ GoTrue(Auth)│  │
│  │            │  │  Strategy    │  │   └ Storage API │  │
│  └────────────┘  └──────────────┘  └────────────────┘  │
│                                                     │
│  ┌────────────┐                                     │
│  │   MinIO    │  ◄── S3 兼容对象存储                  │
│  └────────────┘                                     │
└─────────────────────────────────────────────────────────┘
```

### 2.3 数据流

```
用户 → Next.js → (上传图片) → MinIO
              → (AI 识别请求) → FastAPI → Ollama/百炼 → 返回属性
              → (保存衣物) → Supabase PostgreSQL
              → (查询统计) → Supabase PostgreSQL
```

---

## 3. 数据模型

### 3.1 User（由 Supabase Auth 管理）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| email | VARCHAR | Auth 内置 |
| nickname | VARCHAR | 用户设置 |
| avatar_url | VARCHAR | |
| created_at | TIMESTAMPTZ | |

### 3.2 ClothingItem

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → User | |
| name | VARCHAR | 必填 |
| category | VARCHAR | 枚举：上衣/裤子/外套/鞋子/配饰，必填，互斥 |
| brand | VARCHAR | 选填 |
| color | VARCHAR | 选填 |
| season | VARCHAR | 选填 |
| style | VARCHAR | 选填 |
| image_url | VARCHAR | MinIO 图片地址 |
| notes | TEXT | 选填 |
| is_deleted | BOOL | 软删除标记 |
| created_at | TIMESTAMPTZ | |

图片存储路径：`/{user_id}/{clothing_id}/{filename}`

### 3.3 Tag

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| name | VARCHAR | 标签名 |
| group | VARCHAR | 标签组：风格/场景/季节/自定义 |

### 3.4 ClothingTag

| 字段 | 类型 | 说明 |
|---|---|---|
| clothing_id | UUID FK → ClothingItem | |
| tag_id | UUID FK → Tag | |

多对多关联表。

### 3.5 关键设计决策

- category 是互斥枚举，必填；Tag 是多维标签，通过 ClothingTag 多对多关联
- 删除为软删除（is_deleted），保留历史数据
- 图片存 MinIO，数据库只存 URL 引用

---

## 4. 前端设计

### 4.1 路由与页面树

```
/                       首页（仪表盘）
│                        ├── 统计卡片（总数、本月新增、品牌数）
│                        ├── 分类饼图
│                        └── 最近新增列表（最新 10 件）
│
/auth/login              登录页
/auth/register            注册页
/auth/forgot-password     忘记密码页
│
/wardrobe                 衣柜列表页（主视图）
│                        ├── 搜索栏（关键字 + 分类 + 标签 + 季节筛选）
│                        ├── 衣物卡片网格
│                        └── 分页或无限滚动
│
/wardrobe/add             新增衣物页
│                        ├── 图片上传区（拖拽 + 拍照）
│                        ├── AI 识别结果展示（加载动画 → 填入表单）
│                        ├── 表单（可修改 AI 结果）
│                        └── 保存按钮
│
/wardrobe/[id]            衣物详情页
│                        ├── 大图展示
│                        ├── 属性信息
│                        ├── 标签编辑
│                        └── 编辑 / 删除操作
│
/wardrobe/[id]/edit       编辑衣物页
│                        └── 与新增页类似，预填已有数据
│
/settings                 设置页
│                        ├── 用户资料编辑
│                        └── 修改密码
```

### 4.2 组件目录结构

```
app/
  page.tsx                    # 首页仪表盘
  layout.tsx                  # 全局布局（导航栏 + 侧边栏）
  
  auth/
    login/page.tsx
    register/page.tsx
    
  wardrobe/
    page.tsx                  # 衣柜列表
    add/page.tsx              # 新增衣物
    [id]/
      page.tsx                # 衣物详情
      edit/page.tsx           # 编辑衣物
      
  settings/
    page.tsx
    
components/
  ui/                         # shadcn/ui 基础组件
  layout/
    Navbar.tsx
    Sidebar.tsx
  wardrobe/
    ClothingCard.tsx
    ClothingGrid.tsx
    SearchBar.tsx
    UploadZone.tsx
    AIRecognitionPanel.tsx
    ClothingForm.tsx
  dashboard/
    StatCard.tsx
    CategoryPieChart.tsx
    RecentItems.tsx
```

### 4.3 AI 识别交互流程

上传图片 → 显示加载动画（"AI 正在识别中..."，分类/颜色/风格逐个出现）→ 自动填入表单 → 用户可修改 → 确认保存。

---

## 5. API 设计（BFF 层）

Next.js API Routes 作为 BFF，统一处理认证、数据操作和 AI 请求转发。所有 `/api/*` 通过 Supabase Auth 的 `@supabase/ssr` middleware 验证 JWT。

```
/api/auth/me                    GET     → 当前用户信息
/api/auth/profile               PATCH   → 更新昵称/头像

/api/clothing                   GET     → 衣物列表（分页、搜索、筛选）
/api/clothing                   POST    → 创建衣物
/api/clothing/[id]              GET     → 衣物详情
/api/clothing/[id]              PATCH   → 更新衣物
/api/clothing/[id]              DELETE  → 软删除衣物

/api/clothing/ai/recognize      POST    → 上传图片 → 转发 FastAPI → 返回识别结果

/api/tags                       GET     → 用户标签列表
/api/tags                       POST    → 创建标签

/api/stats/summary              GET     → 统计概览
```

---

## 6. AI 服务设计（FastAPI）

### 6.1 服务结构

```
fastapi/
├── Dockerfile
├── requirements.txt
├── app/
│   ├── main.py
│   ├── api/
│   │   └── routes.py           # /health, /recognize
│   ├── models/
│   │   ├── base.py             # BaseModelStrategy 抽象类
│   │   ├── ollama.py           # Ollama 适配器（本地调试）
│   │   └── bailian.py          # 阿里百炼适配器（生产）
│   ├── services/
│   │   └── recognition.py      # 识别业务逻辑
│   └── schemas/
│       └── clothing.py         # Pydantic 请求/响应模型
```

### 6.2 API

```
POST /recognize

Request:  { "image_url": "http://minio:9000/..." }
Response: {
  "name": "黑色羊绒大衣",
  "category": "上衣",
  "color": "黑色",
  "season": "冬季",
  "style": "商务",
  "material": "羊绒"
}
```

### 6.3 策略切换

通过环境变量 `MODEL` 切换：
- `MODEL=ollama` → OllamaAdapter（本地调试，minicpm-v:latest，~2GB）
- `MODEL=bailian` → BailianAdapter（生产，qwen-vl-max）

---

## 7. 开发环境

### 7.1 Docker Compose 服务列表

| 服务 | 端口 | 说明 |
|---|---|---|
| nextjs | 3000 | 前端 + BFF |
| fastapi | 8001 | AI 识别服务 |
| supabase-kong | 8000 | Supabase API 网关 |
| supabase-db | 5432 | PostgreSQL |
| supabase-auth | 9999 | GoTrue 认证服务 |
| supabase-storage | 5000 | 存储 API |
| minio | 9000 | S3 兼容对象存储 |
| ollama | 11434 | 本地模型运行 |

### 7.2 环境变量

```
# AI Service
MODEL=bailian                    # ollama | bailian
BAILIAN_API_KEY=xxx
BAILIAN_MODEL=qwen-vl-max

# Supabase
SUPABASE_URL=http://localhost:8000
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=wardrobe-images
```

---

## 8. 成功指标

| 指标 | 目标 |
|---|---|
| 用户平均录入衣物数 | ≥ 50 件 |
| 7 日留存率 | ≥ 30% |
| 搜索功能使用率 | ≥ 50% |
| AI 识别准确率 | ≥ 85% |

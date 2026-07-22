# Wardrobe AI MVP — 分阶段实现路线图（Task 4–14）

> **状态：** Task 1–3 已完成（Docker Compose 编排、FastAPI AI 服务、Next.js 脚手架）
> 
> **开始时间：** 2026-07-22
> 
> 本文档将 Task 4–14 拆分为 6 个可独立交付的阶段。每个阶段有明确的输入、输出、涉及文件和提交范围。

---

## 阶段总览

```
阶段 I   认证体系    Task 4 + 5     用户可注册、登录、登出，路由守卫生效
阶段 II  基础设施    Task 6         图片可上传到 MinIO
阶段 III API 层      Task 7 + 8     全部后端 API 就绪（CRUD + 标签 + 统计 + AI 桥接）
阶段 IV  组件库      Task 9 + 10    布局骨架 + 业务组件 Ready
阶段 V   页面集成    Task 11 + 12 + 13   将所有页面连接真实数据和交互
阶段 VI  集成验证    Task 14        端到端验证，bug 修复，最终收尾
```

---

## 阶段 I：认证体系（Task 4 + 5）

**目标：** 用户能够注册、登录、登出，受保护路由自动重定向到登录页。

**前置条件：** Task 3（Next.js 脚手架）已完成

**验收标准：**
- [ ] 访问 `/wardrobe` → 302 重定向到 `/auth/login`
- [ ] 访问 `/settings` → 302 重定向到 `/auth/login`
- [ ] 访问 `/`（首页）→ 200 OK（无需登录）
- [ ] 输入邮箱密码注册 → 自动登录并跳转首页
- [ ] 输入邮箱密码登录 → 跳转首页
- [ ] 登录后可正常访问 `/wardrobe`

### Task 4：Supabase 客户端 + 认证中间件

| 维度 | 内容 |
|---|---|
| 新建文件 | `nextjs/lib/supabase/client.ts`、`nextjs/lib/supabase/server.ts`、`nextjs/middleware.ts` |
| 消费接口 | `nextjs/lib/types.ts` |
| 产出接口 | `createClient()`（浏览器端）、`createServerSupabase()`（服务端）、`createServiceSupabase()`（RLS 旁路）、全局认证 middleware |
| 提交 | `feat: 实现 Supabase 客户端和全局认证中间件` |

### Task 5：认证页面（登录 + 注册 + 回调）

| 维度 | 内容 |
|---|---|
| 新建文件 | `nextjs/app/auth/login/page.tsx`、`nextjs/app/auth/register/page.tsx`、`nextjs/app/auth/callback/route.ts` |
| 消费接口 | `createClient()` from Task 4 |
| 产出接口 | `/auth/login`、`/auth/register`（页面），`/auth/callback`（OAuth 回调路由） |
| 关键交互 | 登录 / 注册表单 → Supabase Auth API → Sonner toast 反馈 → 跳转首页 |
| 提交 | `feat: 实现注册、登录和认证回调页面` |

---

## 阶段 II：基础设施 — 文件存储（Task 6）

**目标：** 图片可以上传到 MinIO 并返回可访问的 URL，支持后续衣物创建流程。

**前置条件：** 阶段 I（认证体系）+ Docker Compose 运行中（MinIO 服务就绪）

**验收标准：**
- [ ] 调用 `uploadImage(file, userId)` 返回类似 `http://localhost:9000/wardrobe-images/{userId}/{uuid}.jpg` 的 URL
- [ ] 调用 `deleteImage(url)` 删除 MinIO 中对应文件
- [ ] Bucket 自动创建（首次调用时）
- [ ] 图片 URL 可在浏览器直接访问（bucket policy 正确）

### Task 6：MinIO 客户端 + 图片上传 API

| 维度 | 内容 |
|---|---|
| 新建文件 | `nextjs/lib/minio.ts` |
| 修改文件 | `nextjs/app/api/clothing/ai/recognize/route.ts`（仅上传桩，AI 集成在阶段 III） |
| 环境变量 | `NEXT_PUBLIC_MINIO_ENDPOINT`、`NEXT_PUBLIC_MINIO_PORT`、`MINIO_ACCESS_KEY`、`MINIO_SECRET_KEY`、`MINIO_BUCKET` |
| 关键函数 | `uploadImage(file, userId): Promise<string>`、`deleteImage(imageUrl): Promise<void>` |
| 提交 | `feat: 实现 MinIO 图片上传客户端` |

---

## 阶段 III：API 层（Task 7 + 8）

**目标：** 所有后端 BFF API Routes 就绪，可通过 curl / Postman 完整测试 CRUD + 标签 + 统计 + AI 识别全流程。

**前置条件：** 阶段 I + 阶段 II

**验收标准：**
- [ ] `GET /api/clothing` — 分页列表，支持搜索 & 筛选（name, category, season, style, tag）
- [ ] `POST /api/clothing` — 创建衣物，JWT 认证绑定 user_id
- [ ] `GET /api/clothing/[id]` — 返回详情含 tags
- [ ] `PATCH /api/clothing/[id]` — 更新，仅允许 owner
- [ ] `DELETE /api/clothing/[id]` — 软删除（is_deleted = true）
- [ ] `GET /api/tags` — 返回用户标签列表
- [ ] `POST /api/tags` — 创建标签
- [ ] `GET /api/stats/summary` — 返回总量、本月新增、品牌数、分类分布、最近新增
- [ ] `POST /api/clothing/ai/recognize` — 接收图片 → 转存 MinIO → 调用 FastAPI → 返回识别结果
- [ ] 所有 `protectedRoute` 均返回 `{ success: false, error }` 结构

### Task 7：API Routes — 衣物 CRUD

| 维度 | 内容 |
|---|---|
| 新建文件 | `nextjs/app/api/clothing/route.ts`（list + create）、`nextjs/app/api/clothing/[id]/route.ts`（get + update + delete） |
| 消费接口 | `createServerSupabase()` (Task 4)、`nextjs/lib/types.ts` (Task 3) |
| 关键实现 | 分页 + 全文搜索（`ilike`）+ 多条件筛选 + 权限校验（RLS + 显式 user_id 检查） + 软删除 |
| 提交 | `feat: 实现衣物 CRUD API 接口` |

### Task 8：API Routes — 标签 + 统计 + AI 识别桥接

| 维度 | 内容 |
|---|---|
| 新建文件 | `nextjs/app/api/tags/route.ts`、`nextjs/app/api/stats/summary/route.ts` |
| 修改文件 | `nextjs/app/api/clothing/ai/recognize/route.ts`（补全 AI 识别逻辑） |
| 消费接口 | `createServerSupabase()` (Task 4)、`uploadImage()` (Task 6)、FastAPI `/recognize`（外部服务） |
| 关键实现 | 标签增删（与衣物关联）、统计聚合 SQL（`count`, `group by category`, `order by created_at desc limit 10`）、AI 识别（接收图片 → 上传 MinIO → 调 FastAPI → 返回 Pydantic 结果 → 送回前端） |
| 提交 | `feat: 实现标签、统计和 AI 识别桥接 API` |

---

## 阶段 IV：组件库（Task 9 + 10）

**目标：** 所有 UI 组件就绪，可独立在 Storybook 或页面中预览，但不接真实数据。

**前置条件：** 阶段 III（API 层）+ Task 3（shadcn/ui 基础组件）

**验收标准：**
- [ ] Navbar — 展示 Logo + 导航链接 + 用户头像下拉菜单（登出）
- [ ] Sidebar — 导航（首页、衣柜、设置），当前路由高亮
- [ ] ClothingCard — 展示缩略图 + 名称 + 分类 badge + 品牌
- [ ] ClothingGrid — 网格布局，空状态提示
- [ ] SearchBar — 关键字输入 + 分类下拉 + 季节下拉 + 标签多选
- [ ] UploadZone — 拖拽上传 / 点击选择，预览缩略图
- [ ] AIRecognitionPanel — 加载骨架屏 → 逐字段动画展示 → 可编辑
- [ ] ClothingForm — 所有字段的受控表单，react-hook-form 校验
- [ ] StatCard — 图标 + 数值 + 标签
- [ ] CategoryPieChart — recharts PieChart 渲染
- [ ] RecentItems — 衣物卡片横向列表

### Task 9：布局组件（导航栏 + 侧边栏）

| 维度 | 内容 |
|---|---|
| 新建文件 | `nextjs/components/layout/Navbar.tsx`、`nextjs/components/layout/Sidebar.tsx` |
| 消费接口 | `createClient()` (Task 4)、`usePathname()` (next/navigation) |
| 关键交互 | Navbar：Logo → `/`，衣柜 → `/wardrobe`，头像下拉 → 设置 / 登出；Sidebar：`/`（仪表盘）、`/wardrobe`（衣柜）、`/settings`（设置），当前路由高亮 |
| 提交 | `feat: 实现导航栏和侧边栏布局组件` |

### Task 10：衣柜组件（卡片、网格、搜索栏、表单、上传区、AI 面板）

| 维度 | 内容 |
|---|---|
| 新建文件 | `nextjs/components/wardrobe/ClothingCard.tsx`、`ClothingGrid.tsx`、`SearchBar.tsx`、`UploadZone.tsx`、`AIRecognitionPanel.tsx`、`ClothingForm.tsx`、`nextjs/components/dashboard/StatCard.tsx`、`CategoryPieChart.tsx`、`RecentItems.tsx` |
| Props 接口 | 组件定义 `interface Props { ... }`，确保在未接真实数据前可用 mock 数据填入 |
| 状态覆盖 | 每个展示组件覆盖：loading、empty、error、正常数据 |
| 提交 | `feat: 实现衣柜和仪表盘业务组件` |

---

## 阶段 V：页面集成（Task 11 + 12 + 13）

**目标：** 所有页面渲染真实数据，用户可完成核心流程：注册 → 登录 → 查看仪表盘 → 浏览衣柜 → 新增衣物（含 AI 识别）→ 查看详情 → 编辑 → 搜索筛选 → 设置页。

**前置条件：** 阶段 IV（组件库）+ 阶段 III（API 层）+ 阶段 I（认证体系）

**验收标准：**
- [ ] 仪表盘：统计卡片数据来自 API，分类饼图正确，最近新增列表正确
- [ ] 衣柜列表：搜索 + 筛选实时生效，卡片网格展示，空状态提示
- [ ] 新增衣物：上传图片 → AI 识别（或跳过）→ 表单填写 → 保存 → 跳转详情
- [ ] 衣物详情：大图 + 所有属性 + 标签 + 编辑/删除按钮
- [ ] 编辑衣物：预填已有数据，修改保存
- [ ] 设置页：编辑昵称 + 头像
- [ ] 侧边栏导航 + Navbar 在所有页面正常运作

### Task 11：页面 — 仪表盘首页

| 维度 | 内容 |
|---|---|
| 文件 | `nextjs/app/page.tsx`（修改）+ `nextjs/app/layout.tsx`（添加 Navbar + Sidebar） |
| 消费接口 | `GET /api/stats/summary` + `createClient()` 获取用户信息 |
| 关键交互 | 加载态 → 数据渲染 StatCard × 3 + CategoryPieChart + RecentItems；错误态 → 错误提示 |
| 提交 | `feat: 实现仪表盘首页，展示统计数据` |

### Task 12：页面 — 衣柜列表 + 新增 + 详情 + 编辑

| 维度 | 内容 |
|---|---|
| 新建/修改文件 | `nextjs/app/wardrobe/page.tsx`、`nextjs/app/wardrobe/add/page.tsx`、`nextjs/app/wardrobe/[id]/page.tsx`、`nextjs/app/wardrobe/[id]/edit/page.tsx` |
| 消费接口 | `GET/POST /api/clothing`、`GET/PATCH/DELETE /api/clothing/[id]`、`POST /api/clothing/ai/recognize`、`GET /api/tags` |
| 关键交互 | 列表：搜索 + 筛选栏 → 衣物网格 → 点击进详情；新增：UploadZone → AIRecognitionPanel → ClothingForm → 保存；详情：大图 + 属性展示 + 编辑/删除；编辑：预填表单 + 提交更新 |
| 提交 | `feat: 实现衣柜列表、新增、详情和编辑页面` |

### Task 13：设置页面

| 维度 | 内容 |
|---|---|
| 文件 | `nextjs/app/settings/page.tsx` |
| 消费接口 | `GET /api/auth/me`、`PATCH /api/auth/profile`、`createClient()` |
| 关键交互 | 展示当前用户信息 → 编辑昵称 → 保存；上传头像 → 保存 |
| 提交 | `feat: 实现用户设置页面` |

---

## 阶段 VI：集成验证与收尾（Task 14）

**目标：** 端到端验收，修复已发现的 bug，确保全流程可用。

**前置条件：** 阶段 V（所有页面集成完毕）

**验收标准：**
- [ ] 全新用户注册 → 空衣柜仪表盘 → 新增 5+ 件衣物（含 AI 识别）→ 搜索筛选 → 编辑 → 删除 → 统计页数据一致
- [ ] Docker Compose 一键启动全栈（`docker compose up -d`）
- [ ] `next build` 无 error / warning
- [ ] PRD v1.0 所有 MVP 功能点通过
- [ ] 页面切换无白屏 / 布局跳动
- [ ] 删除确认弹窗（Dialog）有效
- [ ] 软删除数据不出现在列表和统计中

### Task 14：集成验证与收尾

| 维度 | 内容 |
|---|---|
| 活动 | 1. 手动端到端测试（核心用户路径） 2. 修复发现的 bug 3. 检查 loading/empty/error 态 4. 验证软删除逻辑 5. `npm run build` 确认 6. `docker compose up` 全栈验证 |
| 不涉及 | 单元测试 / E2E 测试（MVP 后补充） |
| 提交 | `fix: MVP 集成验证与问题修复`（可能多次提交） |

---

## 依赖关系图

```
Task 1 (Docker 编排) ──┐
Task 2 (FastAPI AI)  ──┤
Task 3 (Next.js 脚手架) ─┘
           │
      ┌────┴────┐
      │ 阶段 I  │  Task 4 → Task 5 (认证体系)
      └────┬────┘
           │
      ┌────┴────┐
      │ 阶段 II │  Task 6 (MinIO)
      └────┬────┘
           │
      ┌────┴────┐
      │ 阶段 III│  Task 7 → Task 8 (API 层)
      └────┬────┘
           │
      ┌────┴────────┐
      │ 阶段 IV      │  Task 9 + Task 10 (组件库，可并行)
      └────┬────────┘
           │
      ┌────┴────────┐
      │ 阶段 V       │  Task 11 → Task 12 → Task 13 (页面集成)
      └────┬────────┘
           │
      ┌────┴────┐
      │ 阶段 VI │  Task 14 (集成验证)
      └─────────┘
```

> 阶段 IV 的两个 Task 可以**并行开发**：Task 9（布局组件）和 Task 10（业务组件）互不依赖。
> 阶段 V 的页面开发建议**顺序进行**，因为首页需要的组件是最少的，先完成可从简到难递进。

---

## 每个阶段的 Git 分支建议

```
main
  ├── phase-i-auth          (Task 4 + 5)
  ├── phase-ii-minio        (Task 6)
  ├── phase-iii-api         (Task 7 + 8)
  ├── phase-iv-components   (Task 9 + 10)
  ├── phase-v-pages         (Task 11 + 12 + 13)
  └── phase-vi-verify       (Task 14)
```

每个阶段完成后合并回 `main`，再基于最新 `main` 切出下一阶段分支。

---

## 预计工作量

| 阶段 | 任务 | 预计文件数 | 复杂度 |
|---|---|---|---|
| I | Task 4 + 5 | 5 | ⭐⭐ 中 |
| II | Task 6 | 1 | ⭐ 低 |
| III | Task 7 + 8 | 6 | ⭐⭐⭐ 高 |
| IV | Task 9 + 10 | 11 | ⭐⭐⭐ 高 |
| V | Task 11 + 12 + 13 | 4-6 | ⭐⭐⭐ 高 |
| VI | Task 14 | 0（验证） | ⭐⭐ 中 |

> 文档版本：v1.0 · 生成于 2026-07-22 · 基于 `docs/superpowers/plans/2026-07-22-wardrobe-ai-mvp-plan.md`

# Wardrobe AI 阶段测试指导（小白版）

> 面向：未系统做过软件测试的同学  
> 目标：告诉你「除了开发自己随手点一下之外，你该怎么正式做验收」  
> 原则：每个阶段有**可勾选清单**；先会「看结果」，再学「用工具」  
> **联调前必读：** `docs/local-setup-guide.md`（密钥生成、Docker、FastAPI）  
> **文档更新：** 2026-08-13（对照仓库：阶段 I–VI 已交付 + 全响应式壳层）

---

## 当前进展与测试条件

### 功能进度（以代码为准）

| 阶段 | 状态 | 你现在测什么 |
|---|---|---|
| I 认证 | 已交付 | 注册 / 登录 / 登出 / 路由守卫 |
| II MinIO | 已交付 | 上传图能打开、删除后失效 |
| III API | 已交付 | curl / Postman 测 CRUD、标签、统计、AI 桥接 |
| IV 组件 | 已交付 | 打开 `/dev/components` 看四种状态 |
| V 页面 | 已交付 | 仪表盘 → 衣柜 → 新增/详情/编辑 → 设置 |
| VI 收尾 | 代码与基建冒烟已过 | 用**全新账号**在浏览器把主路径再走一遍 |
| 响应式壳层 | 已交付（2026-08） | 375 / 768 底栏；1280 侧栏；无横向滚动 |

没有 Jest / Playwright / pytest，**没有 `npm test`**。路线图写明单元测试与 E2E 在 MVP 后补。当前验收方式是：**手工点选 + curl + `npm run build`**。

### 什么时候算「具备测试条件」

下面全部勾上，才能做阶段 V / VI / 响应式验收（缺一项会误判为产品坏了）：

- [ ] Docker Desktop 为 Running；`docker compose ps` 里 `db` / `supabase-auth` / `supabase-kong` / `minio` 为 running 或 healthy  
- [ ] 已按 `docs/local-setup-guide.md` §3.4 执行业务 migrations（`001`–`003`）  
- [ ] 根目录 `.env` 与 `nextjs/.env.local` 中 `ANON_KEY` **不是** `your-anon-key`  
- [ ] `cd nextjs && npm run dev` 后浏览器能打开 `http://localhost:3000`  
- [ ]（测 AI 时）`curl -s http://localhost:8001/health` 返回 `{"status":"ok"}`；未起 FastAPI 时用「跳过识别」仍可测录入  

未登录拦截、登录页能否打开，**不依赖** Auth 容器是否完全配好密钥；真实注册登录**依赖**密钥与 Auth 容器。

### 文档怎么用

1. 起环境：`docs/local-setup-guide.md`  
2. 分步验收：本文第 3 章（按阶段勾选）  
3. 阶段目标原文：`docs/phased-implementation-roadmap.md`  

---

## 0. 先分清三种测试（别混）

| 类型 | 谁做 | 干什么 | 本项目现阶段 |
|---|---|---|---|
| **开发自测** | 写代码的人 | 改完立刻验证「我刚写的那一小块」 | 已有，但不算正式验收 |
| **阶段验收测试** | 你（产品/测试角色） | 对照本阶段「验收标准」逐条打勾 | **本文重点** |
| **端到端回归** | 阶段六集中做 | 从注册到删衣物整条链路再走一遍 | 阶段 VI |

你现在要养成的习惯：

1. **先看本阶段目标是否达成**，不要跳到未完成阶段的功能上纠结。  
2. **每条用例写：步骤 → 期望结果 → 实际结果 → 通过/失败**。  
3. **失败时留下证据**：截图、终端报错文字、访问的网址、大概时间。

建议建一个简单表格（Notion / Excel / 备忘录均可）：

| 阶段 | 用例编号 | 步骤摘要 | 期望 | 实际 | 结果 | 备注 |
|---|---|---|---|---|---|---|
| I | I-01 | 未登录打开 /wardrobe | 跳到登录页 | … | 通过/失败 | 截图路径 |

---

## 1. 测试前准备（只做一次，以后每次开测前复查）

### 1.1 你需要安装的软件

| 软件 | 用途 | 如何确认装好了 |
|---|---|---|
| **Git** | 拉代码、看分支 | 终端输入 `git --version` 有版本号 |
| **Docker Desktop** | 启动数据库、MinIO、Auth 等 | 菜单栏有 Docker 图标，且显示 Running |
| **Node.js（建议 20+）** | 跑 Next.js 网站 | `node -v`、`npm -v` 有版本号 |
| **浏览器** | Chrome / Edge / Safari 均可 | 能正常上网 |
| （可选）**Postman** 或浏览器扩展 | 测 API，阶段三起很有用 | 能新建请求即可 |

> Mac：终端打开方式是「应用程序 → 实用工具 → 终端」，或 Spotlight 搜 Terminal。

### 1.2 拿到代码并进入项目目录

```bash
cd "/Users/xuanyi/code/Wardrobe AI"
git status
git branch
```

确认你在要测的功能分支上（例如阶段二是 `feat/phase-2-minio`）。若不确定，问开发当前应测哪条分支。

### 1.3 环境变量（最容易卡住小白的一步）

1. 项目根目录应有 `.env`（可从 `.env.example` 复制）。  
2. Next.js 本地开发还需要 `nextjs/.env.local`（一般不提交到 Git）。  
3. 至少检查这些名字是否存在（值不要发到公开群聊）：

- `NEXT_PUBLIC_SUPABASE_URL`（一般是 `http://localhost:8000`）  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
- `SUPABASE_SERVICE_ROLE_KEY`  
- `NEXT_PUBLIC_MINIO_ENDPOINT` / `NEXT_PUBLIC_MINIO_PORT`  
- `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_BUCKET`  

**若密钥仍是 `your-anon-key` 这种占位符：**  
阶段一的「真实注册登录」会失败；但「未登录被踢回登录页」仍可能测得通。  
联调登录前请按 **`docs/local-setup-guide.md`** 用脚本生成并写入与 `JWT_SECRET` 匹配的 `ANON_KEY` / `SERVICE_ROLE_KEY`，再同步到 `nextjs/.env.local`。

### 1.4 启动基础设施（Docker）

打开 Docker Desktop，等它完全启动后，在项目根目录执行：

```bash
cd "/Users/xuanyi/code/Wardrobe AI"

# 先只起存储（阶段二够用）
docker compose up -d minio minio-init

# 测登录时，还需要数据库 + 认证 + 网关（名称以 docker-compose.yml 为准）
docker compose up -d db supabase-auth supabase-kong

# 看是否在跑
docker compose ps
```

**期望：** 相关服务 `State` 为 `running` 或 `healthy`。若反复重启，执行：

```bash
docker compose logs --tail=80 minio
docker compose logs --tail=80 supabase-auth
```

把报错原文发给开发。

### 1.5 启动网站（Next.js）

```bash
cd "/Users/xuanyi/code/Wardrobe AI/nextjs"
npm install          # 第一次或依赖变更时
npm run dev
```

终端出现类似 `Local: http://localhost:3000` 后，用浏览器打开该地址。

**停服：** 在跑 `npm run dev` 的终端按 `Ctrl + C`。

### 1.6 两个万能排查动作

1. **硬刷新页面**：Mac 常用 `Cmd + Shift + R`（避免旧缓存骗人）。  
2. **打开开发者工具**：Chrome 按 `F12` 或 `Cmd + Option + I`  
   - **Console**：看红色报错  
   - **Network**：看哪个请求失败（红字、状态码 4xx/5xx）

---

## 2. 你会用到的「非程序员」测试手法

### 2.1 浏览器手工点测（阶段一、四、五、六主力）

适合：页面跳转、表单、提示文案、布局。

记录方法：每一步写「我点了什么 → 屏幕变成了什么」。

### 2.2 地址栏 / 终端看「状态码」（阶段一、二、三）

在终端执行（把网址换成你的）：

```bash
curl -sI http://localhost:3000/wardrobe | head -20
```

你会看到类似：

- `HTTP/1.1 200` → 成功打开  
- `HTTP/1.1 307` 或 `302`，且有一行 `location: /auth/login` → 被重定向到登录  

> Next.js 重定向经常是 **307**，和文档里写的 302 效果一样，都算「被送去登录页」。

### 2.3 看图片 URL 能不能打开（阶段二）

把返回的 `http://localhost:9000/wardrobe-images/...` 粘贴到浏览器地址栏：

- 能看到图片 → 公开读策略 OK  
- 403 / AccessDenied → bucket 权限有问题  
- 连接失败 → MinIO 没启动或端口不对  

也可打开 MinIO 控制台：`http://localhost:9001`（默认账号密码常为 `minioadmin` / `minioadmin`，以 `.env` 为准）。

### 2.4 API 测试（阶段三起强烈建议）

当页面还没做完，但接口已经写好时，用 **Postman**：

1. 新建请求，选方法（GET/POST…）  
2. 填 URL，例如 `http://localhost:3000/api/clothing`  
3. 若需要登录：先走登录拿到 Cookie/Token（让开发告诉你怎么带）  
4. 点 Send，看状态码与 JSON 内容  

没有 Postman 时，可用终端 `curl`（示例见阶段三）。

**最省事的带登录态办法（推荐）：**

1. 浏览器登录成功。  
2. 打开开发者工具 → **Network**。  
3. 刷新任意已登录页（如 `/wardrobe`），点开一条发往 `/api/` 的请求。  
4. 右键 → **Copy** → **Copy as cURL**。  
5. 粘贴到终端，把 URL 改成你要测的接口即可（Cookie 已带上）。

不要把复制出的 Cookie 发到公开群聊。

### 2.5 「负面用例」一定要测

新手常只测「正确操作」。请额外测：

- 空密码、错误密码  
- 未登录访问受保护页  
- 不传图片就点识别/上传  
- 用 A 用户的数据 ID 去访问（权限，阶段三后）  

---

## 3. 分阶段测试手册

下面每阶段都给出：**目标一句话 → 前置条件 → 逐步操作 → 验收勾选表 → 常见失败原因**。

当前进度提示（2026-08-13）：阶段 I–VI 与响应式壳层均已交付。新同学建议顺序：准备环境 → I（认证）→ V（主路径）→ 响应式 → VI 浏览器回归。III / IV 可穿插，不挡主路径。

---

### 阶段 I：认证体系（注册 / 登录 / 路由守卫）

**目标：** 没登录进不了衣柜和设置；登录后可以进。

#### 前置

- [ ] `npm run dev` 已启动（`:3000`）  
- [ ] 若测真实注册登录：Auth 相关 Docker 已启动，且密钥不是占位符  

#### 用例 I-01：未登录访问衣柜应被拦下

1. 使用「无痕窗口」（Chrome：`Cmd + Shift + N`），避免旧登录态干扰。  
2. 地址栏输入：`http://localhost:3000/wardrobe` 回车。  
3. **期望：** 最终停在登录页（地址含 `/auth/login`）。  
4. （可选）终端：

```bash
curl -sI http://localhost:3000/wardrobe | head -15
```

期望出现 `location: /auth/login`（或等价跳转）。

#### 用例 I-02：未登录访问设置

步骤同 I-01，网址改为 `http://localhost:3000/settings`。

#### 用例 I-03：首页（仪表盘）需登录

> 阶段 V 起：`/` 为仪表盘，未登录应跳转登录页（与 `/wardrobe`、`/settings` 一致）。

1. 无痕窗口打开 `http://localhost:3000/`  
2. **期望：** 跳转到 `/auth/login`。  

```bash
curl -sI http://localhost:3000/ | head -10
```

期望出现 `location: /auth/login`（或等价跳转）。

#### 用例 I-04：打开登录 / 注册页

1. 打开 `http://localhost:3000/auth/login`  
2. 打开 `http://localhost:3000/auth/register`  
3. **期望：** 表单可见（邮箱、密码；注册还有昵称），无白屏。  

#### 用例 I-05：注册成功（需 Auth 就绪）

1. 打开注册页。  
2. 填写昵称、**未用过的邮箱**、密码（≥ 8 位）。  
3. 提交。  
4. **期望：** 成功提示；进入首页或已登录状态；再访问 `/wardrobe` 不再被踢回登录。  

#### 用例 I-06：登录成功 / 失败

1. 用正确账号登录 → 期望进首页。  
2. 故意输错密码 → 期望错误提示，仍停在登录页。  

#### 用例 I-07：登录后访问衣柜

1. 登录后访问 `/wardrobe`。  
2. **期望：** 能看到页面内容（阶段一可能是占位文案「我的衣柜」），而不是登录页。  

#### 阶段 I 勾选表

- [ ] `/wardrobe` 未登录 → 登录页  
- [ ] `/settings` 未登录 → 登录页  
- [ ] `/` 未登录 → 登录页（仪表盘）  
- [ ] 注册流程（Auth 就绪时）  
- [ ] 登录成功 / 失败提示正确  
- [ ] 登录后可进 `/wardrobe`  

#### 常见失败

| 现象 | 可能原因 |
|---|---|
| 一直转圈 / 注册报错 | Auth 没起、Kong 没起、密钥是占位符 |
| 跳转后白屏 | Next 报错，看终端与 Console |
| 明明登录了仍被踢 | Cookie 被拦、域名/端口不一致、中间件配置问题 |

---

### 阶段 II：MinIO 图片上传

**目标：** 图片能存进对象存储，URL 能打开；删除后打不开。

#### 前置

- [ ] `docker compose up -d minio minio-init` 成功  
- [ ] 浏览器能打开 `http://localhost:9001`（控制台）或至少 `:9000` 有响应  

#### 用例 II-01：确认 MinIO 活着

```bash
curl -sI http://localhost:9000/minio/health/live | head -10
```

或打开控制台登录，能看到 bucket（常见名 `wardrobe-images`）。

#### 用例 II-02：上传得到标准 URL（请开发协助或按脚本）

开发自测常用方式：调用 `uploadImage`，得到类似：

`http://localhost:9000/wardrobe-images/{userId}/{uuid}.png`

你作为验收方可以要求开发提供：

1. 一次上传得到的完整 URL  
2. 你在浏览器打开该 URL → **必须能看见图**（状态约 200）  

#### 用例 II-03：删除后不可访问

1. 记下刚上传的 URL。  
2. 开发执行 `deleteImage` 后。  
3. 你再打开同一 URL → **期望 404 或无法显示图片**。  

#### 用例 II-04：识别接口「上传桩」（有登录态时）

接口：`POST http://localhost:3000/api/clothing/ai/recognize`  
表单字段名：`image`（文件）

**期望（阶段二）：**

- 未登录 → `401`，JSON 含 `success: false`  
- 已登录且带图 → `success: true`，有 `image_url`；`data` 可为 `null`（AI 尚未接）  
- 不带图 → `400`  

> 若你还不会带登录 Cookie，本条可让开发演示，你负责核对返回 JSON 字段。

#### 阶段 II 勾选表

- [ ] MinIO 服务健康  
- [ ] 上传 URL 格式正确且浏览器可打开图片  
- [ ] 删除后原 URL 失效  
- [ ]（可选）recognize 上传桩行为符合上面三条  

#### 常见失败

| 现象 | 可能原因 |
|---|---|
| 连接被拒绝 | Docker 没开 / 容器没起 |
| URL 能生成但浏览器打不开 | bucket 策略未设公开读 |
| 上传 500 | 环境变量密钥与 MinIO 不一致 |

---

### 阶段 III：API 层（接口验收）

**目标：** 不依赖完整漂亮页面，也能用工具证明「增删改查 + 标签 + 统计 + AI」可用。

#### 你要准备什么

1. 一个已登录用户的访问凭证（Cookie 或 Token，问开发怎么复制）。  
2. Postman 或 curl。  
3. 一张测试图片。  

#### 建议用例清单（每条都记请求与响应）

| 编号 | 方法 | 路径 | 你要检查的点 |
|---|---|---|---|
| III-01 | GET | `/api/clothing` | 未登录 401；登录后返回列表结构（items/total 等） |
| III-02 | POST | `/api/clothing` | 创建成功；`user_id` 是当前用户；必填缺失要 400 |
| III-03 | GET | `/api/clothing/{id}` | 详情含 tags；别人的 id 不能乱看 |
| III-04 | PATCH | `/api/clothing/{id}` | 只改自己的；字段更新正确 |
| III-05 | DELETE | `/api/clothing/{id}` | 列表不再出现（软删除）；库里可仍有记录但 `is_deleted=true` |
| III-06 | GET/POST | `/api/tags` | 列表与创建 |
| III-07 | GET | `/api/stats/summary` | 总数、分类分布、最近新增合理 |
| III-08 | POST | `/api/clothing/ai/recognize` | 有图 → 有识别结果 + `image_url`；FastAPI 挂了要有明确错误 |

curl 列表示例（登录 Cookie 需替换）：

```bash
curl -s "http://localhost:3000/api/clothing?page=1" \
  -H "Cookie: 这里粘贴你的cookie"
```

#### 阶段 III 勾选表

对照路线图阶段 III 验收标准逐条勾选（见 `docs/phased-implementation-roadmap.md`）。

---

### 阶段 IV：组件库

**目标：** 组件「长得对、状态齐全」，哪怕暂时用假数据。

#### 怎么测（小白友好）

预览页（**无需登录**）：

`http://localhost:3000/dev/components`

页面上有状态切换按钮（loading / empty / error / 有数据）。对每个组件检查四种状态：

1. **正常有数据**  
2. **加载中**（转圈/骨架屏）  
3. **空数据**（友好空状态文案）  
4. **出错**（错误提示，不应白屏）  

重点组件：衣物卡片/网格、搜索栏、上传区、AI 结果面板、表单、统计卡片、饼图、最近新增。

导航与底栏不在预览页，登录后在真实页面测（见「响应式布局」一节）。

#### 阶段 IV 勾选表

- [ ] `/dev/components` 能打开、无白屏  
- [ ] 卡片信息完整（图、名、分类、品牌）  
- [ ] 空 / 加载 / 错误态不吓人、不白屏  
- [ ] 表单校验：必填为空时有提示  
- [ ] 登录后：当前页在侧栏（宽屏）或底栏（窄屏）高亮正确  

---

### 阶段 V：页面集成（按真实用户路径测）

**目标：** 像真实用户一样走完「管衣橱」。页面在 `app/(authenticated)/` 下。

建议主路径（P0，必须）：

1. 注册 / 登录  
2. 看仪表盘（空数据也要合理）  
3. 新增衣物（上传 → 可选 AI → 保存）  
4. 列表里找得到  
5. 搜索 / 筛选  
6. 进详情 → 编辑 → 保存  
7. 删除 → 列表与统计同步变化  
8. 设置页改昵称（及头像）  

次要路径（P1）：

- 错误网络下的提示  
- 超大图片 / 非图片文件  
- 快速连点提交是否重复创建  
- AI 识别失败时「跳过识别」仍可手动保存  

每条路径用手机宽度也看一眼；完整断点清单见下一节「响应式布局」。

#### 阶段 V 勾选表（操作清单）

- [ ] 未登录访问 `/`、`/wardrobe`、`/settings` → 均跳转 `/auth/login`
- [ ] 登录后 `/`：StatCard × 3 + 分类饼图 + 最近新增（空态合理）
- [ ] `/wardrobe`：SearchBar 搜索/分类/季节/单标签筛选生效；空态正常
- [ ] `/wardrobe/add`：上传 → AI（或跳过）→ 保存 → 进入 `/wardrobe/[id]`
- [ ] 详情页：大图 + 属性 + 编辑 / 删除（Dialog 确认）
- [ ] `/wardrobe/[id]/edit`：预填保存后回详情
- [ ] 删除后列表与仪表盘统计同步减少
- [ ] `/settings`：改昵称、换头像，刷新后仍保留
- [ ] 用户菜单可退出登录，退出后受保护页再进会跳登录

次要（P1，不阻断阶段完成）：

- [ ] 登录页能打开「忘记密码」页（`/auth/forgot-password`）；本地自托管通常收不到邮件，不强制测重置链路

---

### 响应式布局（电脑 / 平板 / 手机）

**目标：** 同一套页面在三种宽度都能用：导航找得到、内容不被挡、没有左右拖动。

**怎么开设备模式（Chrome）：** 页面上按 `Cmd + Option + I` → 再按 `Cmd + Shift + M`（设备工具栏）。顶部宽度框输入数字后回车。每换一次宽度，**硬刷新**一次（`Cmd + Shift + R`）。

建议宽度（与实现断点一致，不要用「随便缩一下窗口」代替）：

| 宽度 | 代表 | 导航应看到 |
|---|---|---|
| **375** | 手机 | 顶部：`WA` 徽章 + 用户菜单；**底部 Tab**：仪表盘 / 衣柜 / 设置。**没有**左侧栏 |
| **768** | 平板 | 顶部：`WA` + 「Wardrobe AI」+ 用户菜单；仍是**底部 Tab**，**没有**左侧栏 |
| **1280** | 电脑 | 顶部：品牌 + 用户菜单（**没有**顶栏「仪表盘/衣柜」文字链）；**左侧栏**三项。**没有**底部 Tab |

登录页、注册页没有底栏/侧栏，只检查表单完整、无横向滚动。

#### 前置

- [ ] 已登录（测壳层必须进 `(authenticated)` 页面）  
- [ ] `npm run dev` 开着  

#### 用例 R-01：375 — 底栏可点且不挡内容

1. 宽度设为 `375`，打开 `/`。  
2. **期望：** 底部三 Tab 可见；点「衣柜」到 `/wardrobe`，点「设置」到 `/settings`，当前项高亮。  
3. 滚到页面最底部。  
4. **期望：** 最后一行内容在底栏**上方**，没有被挡住；底栏按钮高度够点（不要只有图标尖角能点中）。  
5. 打开 `/wardrobe/add`、一件衣物的详情页。  
6. **期望：** 提交/编辑/删除按钮在窄屏是通栏或可完整点到；标签「创建」与输入框可换行，输入框不被挤没。  

#### 用例 R-02：375 / 768 — 无横向滚动

1. 在 375 与 768 分别打开：登录页、`/`、`/wardrobe`、详情、`/wardrobe/add`、`/settings`。  
2. **期望：** 不能左右拖出白边；仪表盘饼图文字不被裁切（窄屏看图例即可）。  

#### 用例 R-03：768 — 仍是底栏

1. 宽度 `768`，打开 `/`。  
2. **期望：** 有底栏、无侧栏；顶栏出现完整「Wardrobe AI」文案。  

#### 用例 R-04：1280 — 侧栏替换底栏

1. 宽度 `1280`，打开 `/`。  
2. **期望：** 左侧栏可见且当前页高亮；底部**没有** Tab；顶栏**没有**重复的「仪表盘 / 我的衣柜」文字链接。  
3. 侧栏点三项，页面切换正确。  

#### 用例 R-05：iOS 安全区（有真机再测）

用手机 Safari 打开本机 `http://你的电脑局域网IP:3000`（电脑与手机同一 Wi-Fi；防火墙放行 3000）。

**期望：** 底栏贴在屏幕底部，不被 Home 条挡住；内容仍能滚到底。没有真机可跳过，不阻断。

#### 响应式勾选表

- [ ] 375：底栏三项可切换，内容不被挡  
- [ ] 375 / 768：所列页面无横向滚动  
- [ ] 768：底栏在、侧栏无  
- [ ] 1280：侧栏在、底栏无、顶栏无重复导航  
- [ ]（可选）真机 Safari 安全区

---

### 阶段 VI：集成验证与收尾

**目标：** 全链路回归 + 构建检查。

#### 必做

1. **全新账号**从零走通主路径（不要用开发者长期脏数据账号）。  
2. 至少录入 **5 件**衣物（含至少 1 次 AI 识别，若 FastAPI 已接通）。  
3. 删除后确认列表与统计都少了对应项。  
4. 请开发执行：

```bash
cd nextjs && npm run build
```

期望无 error。  

5. 按 `docs/local-setup-guide.md` §3.4 起栈并执行业务 migrations。  

#### 阶段 VI 勾选表（2026-08 代理验证记录）

- [x] `npm run build` exit 0（feat/phase-6-verify）
- [x] 未登录 `/` `/wardrobe` `/settings` → `/auth/login`
- [x] `GET /api/clothing` 未登录 → `{"success":false,"error":"未登录"}`
- [x] Kong + GoTrue：`POST /auth/v1/signup` 可注册并返回 access_token
- [x] MinIO health live
- [x] 业务表 + `003` INSERT policy 已应用
- [x] 软删除：`is_deleted=true` 后 active 计数减少（SQL 验证）
- [x] 代码缺口：AI 成功自动回填；新增/编辑 TagPicker 提交 `tag_ids`
- [ ] 浏览器：登录后仪表盘 / 新增 5 件（含 AI）/ 搜索 / 编辑 / Dialog 删除 / 设置头像（需本机登录会话）
- [ ] FastAPI `:8001/health`（镜像构建若受 Docker Hub 网络影响，可本机起 uvicorn）

#### 阶段 VI 勾选表（路线图对照）

直接使用路线图阶段 VI 验收标准；浏览器项以本表上一节为准补勾。

---

## 4. 缺陷怎么写，别人才修得快

一份好 bug 报告包含：

1. **标题**：一句话，例如「未登录访问 /wardrobe 未跳转登录页」  
2. **环境**：分支名、浏览器、是否无痕、Docker 是否启动  
3. **步骤**：1、2、3… 可复现  
4. **期望 vs 实际**  
5. **附件**：截图、Console 红字、Network 失败请求名与状态码  

严重级别建议：

- **阻断**：主路径走不通（无法登录、无法保存衣物）  
- **严重**：核心功能错误（删了还在列表）  
- **一般**：文案、样式、次要筛选  
- **轻微**：错别字、间距  

---

## 5. 建议的测试节奏（配合开发阶段）

| 时机 | 你做什么 |
|---|---|
| 开发说「阶段 X 可测了」 | 当天按本章对应阶段跑完勾选表 |
| 发现阻断 bug | 立刻反馈，阶段不标记完成 |
| 阶段通过 | 在勾选表签字/留日期，再允许进入下一阶段开发重点 |
| 每周一次（有多阶段代码后） | 抽查「上一阶段」是否被改坏（简单回归） |
| 阶段 VI 前 | 冻结新功能，只修 bug + 全量回归 |

---

## 6. 最小工具箱命令速查

```bash
# 进项目
cd "/Users/xuanyi/code/Wardrobe AI"

# 看容器
docker compose ps

# 起 MinIO
docker compose up -d minio minio-init

# 起网站
cd nextjs && npm run dev

# 看重定向
curl -sI http://localhost:3000/wardrobe | head -15

# 看首页
curl -sI http://localhost:3000/ | head -10

# 组件预览（无需登录）
# 浏览器打开 http://localhost:3000/dev/components
```

---

## 7. 你现在立刻可以开始的「今日任务」

具备测试条件后，按这次顺序做（约 1 小时，不含 AI 模型下载）：

1. 勾完本文「当前进展与测试条件」里的准备项；不过就先跑 `docs/local-setup-guide.md` §3–§5。  
2. 无痕窗口：**阶段 I**（未登录拦截 + 注册登录）→ **阶段 V 勾选表**。  
3. Chrome 设备模式：**响应式勾选表**（375 / 768 / 1280）。  
4. 全新账号补 **阶段 VI 浏览器项**（至少 5 件衣物、删除 Dialog、设置头像；AI 可选）。  
5. 失败项按第 4 章格式写 bug。  

若只想先确认「站能开、登录能进」：做第 1 步 + 用例 I-01、I-05、I-06 即可。  

---

## 8. 相关文档

- 本地配置与联调：`docs/local-setup-guide.md`（密钥生成、Docker、FastAPI）  
- 架构说明：`docs/technical-architecture.md`  
- 阶段目标原文：`docs/phased-implementation-roadmap.md`  
- 产品范围：`PRD-v1.0.md`

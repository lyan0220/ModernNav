# ModernNav

个人导航仪表盘，玻璃拟态风格。基于 React + Tailwind CSS + Cloudflare Pages (Functions + D1)。

[English](README_en.md) | 中文

## 功能

**前台**

- 玻璃拟态卡片 — 模糊/饱和度/边缘光物理引擎，自适应明暗主题
- 灵动岛导航栏 — 桌面端玻璃态浮动导航，移动端侧滑抽屉
- 命令面板 — `Ctrl+K` 或 `/` 唤起，模糊搜索支持拼音首字母匹配
- 多引擎搜索栏 — 可在后台自定义搜索引擎，下拉切换
- 最常访问 — 自动统计点击次数，生成虚拟分类展示高频链接
- 1080p / 2K / 4K 视口自适应，所有尺寸按比例缩放
- 明暗主题一键切换，全局主题色一键换色
- 中英双语，一键切换
- PWA 离线缓存，无网可用

**后台 (`/admin`)**

- 内容管理 — 分类/子分类/链接的增删改查，拖拽排序
- 全局设置 — 站点标题、Favicon API、搜索引擎配置、最常访问开关
- 外观设置 — 背景图片、模糊度、透明度、主题色（支持从图片自动提取）
- 数据管理 — JSON 一键导入导出，浏览器书签 HTML 导入
- 安全设置 — 修改管理密码
- 链接表单自动抓取网页标题和描述

**工程**

- 关系化存储 — D1 分表 (categories / subcategories / links) + config KV，v1→v2 自动迁移
- Diff 写入 — 只发变更部分，一次 D1 batch 事务完成
- JWT HMAC-SHA256 认证 + HttpOnly Cookie 静默刷新 + IP 级限流
- TanStack Query 乐观更新 + LocalStorage 离线兜底
- 图标多级降级 (favicon.im → Google → DuckDuckGo)
- React.lazy 路由级代码分割

## 技术栈

| 层     | 技术                                                         |
| ------ | ------------------------------------------------------------ |
| 前端   | React 18 · Vite 5 · Tailwind 3 · TypeScript 5 · Lucide React |
| 数据层 | TanStack Query v5 · LocalStorage 持久化 · 乐观更新           |
| 后端   | Cloudflare Pages Functions                                   |
| 数据库 | Cloudflare D1 (SQLite)                                       |
| 认证   | JWT HMAC-SHA256 · HttpOnly Cookie                            |
| 工程   | ESLint · Prettier · Vitest · PWA (vite-plugin-pwa)           |

## 快速开始

### 前置要求

- Node.js >= 18
- npm

### 安装

```bash
npm install
```

### 本地开发（仅前端）

数据存储在 LocalStorage，无需后端：

```bash
npm run dev
```

### 全栈开发（含 D1）

```bash
# 初始化本地数据库
npx wrangler d1 execute modern-nav-db --local --file=./schema.sql

# 构建后启动 Cloudflare Pages 模拟
npm run build
npx wrangler pages dev ./dist
```

### 常用命令

```bash
npm run build          # 生产构建
npm run typecheck      # TypeScript 类型检查（前端 + Functions）
npm run lint           # ESLint
npm run test           # Vitest 单元测试
npm run test:watch     # 测试监听模式
```

## 部署 (Cloudflare Pages)

只需一个免费的 Cloudflare 账号，几分钟即可上线。

### 1. Fork 仓库

将本仓库 Fork 到你的 GitHub 账号下。

### 2. 创建 Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左侧导航找到 **Workers & Pages** → 点击 **Create** → 选择 **Pages** → **Connect to Git**
3. 选择你刚才 Fork 的仓库，填写构建配置：
   - **Framework preset:** `无`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. 点击 **Save and Deploy**，等待首次构建完成

### 3. 创建并绑定数据库

1. 回到 Cloudflare Dashboard，左侧导航找到 **D1 SQL Database** → 点击 **Create**
2. 数据库名称填 `modern-nav-db`，点击创建
3. 进入数据库页面，切换到 **Console** 标签
4. 打开项目中的 `schema.sql` 文件，复制全部内容粘贴到 Console 中，点击 **Execute**
5. 回到你的 Pages 项目 → **Settings** → **Functions** → 找到 **D1 Database Bindings**
6. 添加绑定：
   - Variable name 填 `DB`（必须完全一致）
   - D1 Database 选择 `modern-nav-db`
7. 保存后，进入 **Deployments** → 点击最新部署右侧的 **⋯** → **Retry deployment** 重新部署

### 4. 开始使用

1. 部署完成后访问你的站点地址（`xxx.pages.dev`）
2. 点击导航栏右侧的齿轮图标进入后台
3. 输入默认密码 `admin` 登录
4. **第一件事**：进入「安全设置」修改默认密码

> **从旧版升级？** 无需手动操作。部署新代码后首次访问会自动检测 schema 版本并完成迁移，数据不会丢失。建议升级前在 D1 控制台导出一份备份。

## 项目结构

```
functions/api/                          # Cloudflare Pages Functions
├── auth.ts                             # 登录 / 刷新 / 改密
├── bootstrap.ts                        # 初始化数据 + 自动迁移
├── health.ts                           # 健康检查
├── metadata.ts                         # 网页元数据抓取（标题/描述/图标）
├── update.ts                           # 数据写入（diff-based）
├── visit.ts                            # 链接点击计数
└── utils/
    ├── schema.ts                       # DDL + schema 版本管理
    ├── migration.ts                    # v1 → v2 迁移
    ├── diff.ts                         # 分类差异计算 + 应用
    ├── reads.ts                        # D1 读取 + bootstrap 组装
    ├── writes.ts                       # 全量写入（仅迁移用）
    ├── authHelpers.ts                  # JWT / Cookie / 限流
    ├── validation.ts                   # 数据校验
    └── logger.ts                       # 日志

src/
├── components/
│   ├── admin/                          # 后台路由页
│   │   ├── AdminLayout.tsx             # 后台外壳（顶栏 + 主题）
│   │   ├── AdminGuard.tsx              # 登录态路由守卫
│   │   ├── AdminAuthPage.tsx           # 登录页
│   │   ├── ContentPage.tsx             # 内容管理
│   │   ├── GeneralPage.tsx             # 全局设置
│   │   ├── AppearancePage.tsx          # 外观设置
│   │   ├── DataPage.tsx                # 数据备份
│   │   └── SecurityPage.tsx            # 安全设置
│   ├── settings/                       # 设置面板 UI
│   │   ├── SettingsPrimitives.tsx      # 共享布局原语
│   │   ├── ContentTab.tsx              # 内容管理 UI
│   │   ├── CategorySidebar.tsx         # 分类侧栏
│   │   ├── SubcategoryPanel.tsx        # 子分类面板
│   │   ├── LinkCard.tsx                # 链接卡片
│   │   ├── LinkForm.tsx                # 链接表单（含元数据抓取）
│   │   ├── useContentEditor.ts         # 内容编辑逻辑
│   │   ├── AppearanceTab.tsx           # 外观设置 UI
│   │   ├── GeneralTab.tsx              # 全局设置 UI
│   │   ├── DataTab.tsx                 # 数据备份 UI（含书签导入）
│   │   └── SecurityTab.tsx             # 安全设置 UI
│   ├── BackgroundLayer.tsx             # 背景渲染
│   ├── CategoryNav.tsx                 # 导航栏（桌面灵动岛 + 移动抽屉）
│   ├── CommandPalette.tsx              # 命令面板（Ctrl+K 模糊搜索）
│   ├── GlassCard.tsx                   # 玻璃卡片组件
│   ├── SearchBar.tsx                   # 多引擎搜索
│   ├── SmartIcon.tsx                   # 图标（缩放 + 降级）
│   ├── Footer.tsx                      # 页脚
│   ├── SkeletonLoader.tsx              # 骨架屏
│   ├── SyncIndicator.tsx               # 同步状态
│   ├── IconPicker.tsx                  # 图标选择
│   └── Toast.tsx                       # 全局提示
├── hooks/
│   ├── useDashboardLogic.ts            # 核心业务逻辑（含最常访问计算）
│   ├── useThemeColor.ts                # 主题色 + dark class 管理
│   ├── useViewportScale.ts             # 视口缩放因子
│   ├── useResponsiveColumns.ts         # 响应式列数
│   ├── useCategoryDragDrop.ts          # 拖拽排序
│   └── useAuth.ts                      # 登录态
├── services/
│   ├── apiClient.ts                    # API 客户端（拦截 / 重试 / 静默刷新）
│   ├── queries.ts                      # TanStack Query hooks
│   └── storage.ts                      # LocalStorage 读写 + 导入导出
├── contexts/
│   └── LanguageContext.tsx             # 多语言 Context
├── locales/
│   ├── en.json                         # 英文翻译
│   └── zh.json                         # 中文翻译
├── constants/
│   └── defaults.ts                     # 默认值常量
├── types/
│   ├── index.ts                        # 共享类型定义
│   └── errors.ts                       # ApiError 类
├── utils/
│   ├── color.ts                        # 背景图主色提取
│   ├── errorHandler.ts                 # 错误码 → 用户提示映射
│   ├── favicon.ts                      # Favicon URL 生成
│   ├── fuzzyMatch.ts                   # 模糊匹配算法（前缀/连续加分）
│   ├── parseBookmarks.ts               # 浏览器书签 HTML 解析
│   ├── parseMetadata.ts                # HTML 元数据提取（标题/描述/图标）
│   └── pinyinInitials.ts               # 汉字 → 拼音首字母映射
├── App.tsx                             # 根组件
├── constants.tsx                       # 搜索引擎等常量
├── index.tsx                           # 入口（路由 + React.lazy 分包）
└── index.css                           # 全局样式 + 主题 token
```

## License

MIT

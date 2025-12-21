
# ModernNav - 个人导航仪表盘

ModernNav 是一个现代、极简的卡片式导航仪表盘，采用毛玻璃（Glassmorphism）设计风格。它旨在成为一个美观、可高度自定义的浏览器起始页或书签管理器。

本项目基于 **React**、**Tailwind CSS** 和 **Cloudflare Pages** (Functions + D1 Database) 构建。

[English Documentation](README_en.md) | [📅 开发计划 (Roadmap)](ROADMAP.md)

## ✨ 功能特性

*   **🎨 惊艳的 UI 设计:** 采用自适应毛玻璃特效（Glassmorphism），拥有流畅的动画效果和响应式布局。
*   **🌓 深色/浅色模式:** 支持自动主题切换，并能从背景图片中智能提取主色调。
*   **🖱️ 拖拽排序:** 在管理界面通过拖拽轻松调整分类和链接的顺序。
*   **🖼️ 高度个性化:** 支持更换背景图片、调节卡片模糊度和透明度，以及自定义主题颜色。
*   **📂 分组管理:** 支持创建一级分类和二级子菜单（文件夹）来整理链接。
*   **🔍 聚合搜索:** 内置搜索栏，支持 Google、必应、百度、GitHub 等多种搜索引擎切换。
*   **🔐 无状态安全认证:** 采用 **HMAC 签名无状态认证**。保留 HttpOnly Cookie 和短效访问令牌的双重安全机制，全面防止 XSS 与 CSRF 攻击。
*   **🛡️ 数据健壮性保护:** 内置严格的数据类型校验与容错机制，自动修复异常数据结构，杜绝白屏崩溃，确保系统在数据格式升级或异常时依然稳定运行。
*   **☁️ 智能混合存储:**
    *   **读取策略 (网络优先):** 优先获取云端 D1 数据库最新数据，网络异常时自动降级读取本地缓存，确保页面秒开且在离线状态下依然可用。
    *   **写入策略 (乐观更新):** 修改配置立即生效，无需等待服务器响应，并在后台静默同步至 Cloudflare D1，提供丝滑流畅的操作体验。
*   **🌍 国际化:** 内置英语和简体中文支持。
*   **💾 全量备份:** 支持将所有数据（分类、链接、背景设置、偏好设置）导出为 JSON 文件，或随时一键恢复。

## 🛠️ 技术栈

*   **前端:** React 19, Vite, Tailwind CSS, Lucide React
*   **后端:** Cloudflare Pages Functions (Serverless 无服务器函数)
*   **数据库:** Cloudflare D1 (Serverless SQL Database)
*   **鉴权:** 无状态 JWT (HMAC-SHA256) + HttpOnly Cookie
*   **语言:** TypeScript

## 🚀 快速开始

### 前置要求

*   Node.js (v18 或更高版本)
*   npm 或 yarn

### 1. 安装依赖

```bash
npm install
```

### 2. 本地开发 (仅前端)

如果您只想修改 UI 界面（数据将存储在 LocalStorage）：

```bash
npm run dev
```

### 3. 本地开发 (全栈 + Cloudflare 模拟)

要在本地测试后端 API 和 D1 存储，您需要安装 `wrangler` CLI 工具。

1.  安装 Wrangler:
    ```bash
    npm install -D wrangler
    ```

2.  初始化本地数据库表结构 (使用 sql 格式文件):
    ```bash
    npx wrangler d1 execute modern-nav-db --local --file=./schema.sql
    ```

3.  运行 Cloudflare Pages 模拟环境:
    ```bash
    npx wrangler pages dev . --d1 DB=modern-nav-db
    ```
    *这将在本地模拟 Cloudflare 的运行环境。*

## 📦 部署指南 (Cloudflare Pages)

本项目专为 **Cloudflare Pages** 优化。

### 第一步: 推送到 Git
将此仓库Fork到您的 GitHub 或 GitLab 仓库。

### 第二步: 创建 Cloudflare 项目
1.  登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2.  进入 **Workers & Pages** > **Overview** > **Create Application** > **Pages** > **Connect to Git**。
3.  选择您的代码仓库。

### 第三步: 构建设置 (Build Settings)
*   **Framework preset (框架预设):** 选择 `无`
*   **Build command (构建命令):** `npm run build`
*   **Build output directory (输出目录):** `dist`

### 第四步: 配置数据库 (D1)
1.  项目创建完成后，在 Cloudflare 侧边栏点击 **Workers & Pages** > **D1 SQL Database**。
2.  点击 **Create** 创建一个数据库 (例如命名为 `modern-nav-db`)。
3.  点击进入该数据库，选择 **Console** 标签页。
4.  **重要:** 打开项目中的 `schema.sql` 文件，复制其中的 SQL 语句并在 Console 中 **Execute**，以初始化表结构和默认密码。
5.  回到您刚才创建的 Pages 项目页面: 点击 **Settings** > **Functions** > **D1 Database Bindings**。
6.  添加绑定 (Add binding):
    *   **Variable name (变量名):** 必须填写 `DB` (必须完全一致)。
    *   **D1 Database:** 选择您刚才创建的 `modern-nav-db`。
7.  **保存** 并 **重新部署** (进入 Deployments > 点击最新部署右侧的三个点 > Retry deployment)。

## ⚙️ 配置与使用

### 初始化设置
1.  打开部署好的网站。
2.  点击右上角的 **设置 (齿轮图标)**。
3.  输入默认访问代码: `admin`。
4.  **重要提示:** 请立即进入 "安全设置 (Security)" 选项卡修改您的访问代码。

### 个性化
*   **内容管理:** 在 "内容管理" 标签页添加分类和链接，支持拖拽排序。
*   **外观设置:** 在 "外观设置" 标签页更改背景图片 URL 和调节卡片透明度。

## 📂 项目结构

```
├── components/        # React UI 组件
│   ├── GlassCard.tsx  # 毛玻璃卡片组件
│   ├── LinkManagerModal.tsx  # 链接管理模态框
│   ├── SearchBar.tsx  # 搜索栏组件
│   ├── SyncIndicator.tsx  # 同步状态指示器
│   └── Toast.tsx      # 提示消息组件
├── contexts/          # React Contexts
│   └── LanguageContext.tsx  # 国际化语言上下文
├── functions/api/     # Cloudflare Pages Functions (后端 API)
│   ├── bootstrap.ts   # 初始化数据加载 (Read D1)
│   ├── update.ts      # 数据保存 (Write D1)
│   ├── auth.ts        # 认证 API 端点 (处理登录、令牌刷新等)
│   ├── health.ts      # 健康检查接口
│   └── utils/         # API 工具函数库
│       ├── authHelpers.ts  # 认证工具函数 (加密、验证、速率限制等)
│       ├── logger.ts  # 日志记录工具
│       └── validation.ts  # 数据验证工具
├── services/          # 服务层
│   └── storage.ts     # 数据存储服务
├── utils/             # 工具函数
│   └── color.ts       # 颜色处理工具
├── schema.sql         # 数据库初始化脚本 (SQL语句)
├── constants.tsx      # 常量定义
├── types.ts           # TypeScript 类型定义
└── ROADMAP.md         # 开发计划文档
```

## 📄 许可证

MIT License. 供个人免费使用和修改。

# ModernNav

A personal navigation dashboard with a glassmorphism aesthetic. Built with React + Tailwind CSS + Cloudflare Pages (Functions + D1).

[中文](README.md) | English

## Features

**Frontend**

- Glassmorphism cards — blur/saturation/rim-light physics engine, adaptive light/dark theme
- Dynamic Island nav bar — floating glass nav on desktop, slide-out drawer on mobile
- Command palette — `Ctrl+K` or `/` to open, fuzzy search with pinyin initial matching
- Multi-engine search bar — configurable search engines in admin, dropdown switcher
- Most Visited — automatic click tracking, generates a virtual category of frequently used links
- 1080p / 2K / 4K viewport auto-scaling, all dimensions proportional
- Light/dark theme toggle, global accent color with one click
- English and Chinese, one-click switch
- PWA offline cache

**Admin Panel (`/admin`)**

- Content — CRUD for categories/subcategories/links, drag & drop reorder
- General — site title, favicon API, search engine config, most-visited toggle
- Appearance — background image, blur, opacity, theme color (auto-extract from image)
- Data — JSON import/export, browser bookmark HTML import
- Security — change admin password
- Link form auto-fetches page title and description

**Engineering**

- Relational storage — D1 tables (categories / subcategories / links) + config KV, auto v1→v2 migration
- Diff-based writes — only sends changes, single D1 batch transaction
- JWT HMAC-SHA256 auth + HttpOnly cookie silent refresh + per-IP rate limiting
- TanStack Query optimistic updates + LocalStorage offline fallback
- Multi-level icon fallback (favicon.im → Google → DuckDuckGo)
- React.lazy route-level code splitting

## Tech Stack

| Layer    | Technology                                                        |
| -------- | ----------------------------------------------------------------- |
| Frontend | React 18 · Vite 5 · Tailwind 3 · TypeScript 5 · Lucide React      |
| Data     | TanStack Query v5 · LocalStorage persistence · Optimistic updates |
| Backend  | Cloudflare Pages Functions                                        |
| Database | Cloudflare D1 (SQLite)                                            |
| Auth     | JWT HMAC-SHA256 · HttpOnly Cookie                                 |
| Tooling  | ESLint · Prettier · Vitest · PWA (vite-plugin-pwa)                |

## Getting Started

### Prerequisites

- Node.js >= 18
- npm

### Install

```bash
npm install
```

### Local Development (Frontend Only)

Data stored in LocalStorage, no backend needed:

```bash
npm run dev
```

### Full-Stack Development (with D1)

```bash
# Initialize local database
npx wrangler d1 execute modern-nav-db --local --file=./schema.sql

# Build then start Cloudflare Pages simulation
npm run build
npx wrangler pages dev ./dist
```

### Common Commands

```bash
npm run build          # Production build
npm run typecheck      # TypeScript check (frontend + Functions)
npm run lint           # ESLint
npm run test           # Vitest unit tests
npm run test:watch     # Test watch mode
```

## Deployment (Cloudflare Pages)

All you need is a free Cloudflare account. Takes just a few minutes.

### 1. Fork the Repo

Fork this repository to your own GitHub account.

### 2. Create a Pages Project

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. In the left sidebar, find **Workers & Pages** → click **Create** → choose **Pages** → **Connect to Git**
3. Select your forked repo and fill in the build settings:
   - **Framework preset:** `None`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Click **Save and Deploy** and wait for the first build to finish

### 3. Create and Bind the Database

1. Back in the Cloudflare Dashboard, find **D1 SQL Database** in the left sidebar → click **Create**
2. Name it `modern-nav-db` and create
3. Go to the database page, switch to the **Console** tab
4. Open `schema.sql` from the project, copy all contents, paste into the Console, and click **Execute**
5. Go back to your Pages project → **Settings** → **Functions** → find **D1 Database Bindings**
6. Add a binding:
   - Variable name: `DB` (must be exact)
   - D1 Database: select `modern-nav-db`
7. Save, then go to **Deployments** → click **⋯** on the latest deployment → **Retry deployment**

### 4. Start Using

1. Once deployed, visit your site URL (`xxx.pages.dev`)
2. Click the gear icon on the right side of the nav bar to enter admin
3. Log in with the default password `admin`
4. **First thing to do:** go to Security settings and change the default password

> **Upgrading from an older version?** No manual steps needed. After deploying the new code, the first request auto-detects the schema version and migrates your data. Nothing is lost. We recommend exporting a backup from the D1 console before upgrading.

## Project Structure

```
functions/api/                          # Cloudflare Pages Functions
├── auth.ts                             # Login / refresh / change password
├── bootstrap.ts                        # Init data + auto migration
├── health.ts                           # Health check
├── metadata.ts                         # Web metadata fetch (title/desc/icon)
├── update.ts                           # Data writes (diff-based)
├── visit.ts                            # Link click tracking
└── utils/
    ├── schema.ts                       # DDL + schema version management
    ├── migration.ts                    # v1 → v2 migration
    ├── diff.ts                         # Category diff computation + apply
    ├── reads.ts                        # D1 reads + bootstrap assembly
    ├── writes.ts                       # Full writes (migration only)
    ├── authHelpers.ts                  # JWT / Cookie / rate limiting
    ├── validation.ts                   # Data validation
    └── logger.ts                       # Logging

src/
├── components/
│   ├── admin/                          # Admin route pages
│   │   ├── AdminLayout.tsx             # Admin shell (top bar + theme)
│   │   ├── AdminGuard.tsx              # Auth route guard
│   │   ├── AdminAuthPage.tsx           # Login page
│   │   ├── ContentPage.tsx             # Content management
│   │   ├── GeneralPage.tsx             # General settings
│   │   ├── AppearancePage.tsx          # Appearance settings
│   │   ├── DataPage.tsx                # Data backup
│   │   └── SecurityPage.tsx            # Security settings
│   ├── settings/                       # Settings panel UI
│   │   ├── SettingsPrimitives.tsx      # Shared layout primitives
│   │   ├── ContentTab.tsx              # Content management UI
│   │   ├── CategorySidebar.tsx         # Category sidebar
│   │   ├── SubcategoryPanel.tsx        # Subcategory panel
│   │   ├── LinkCard.tsx                # Link card
│   │   ├── LinkForm.tsx                # Link form (with metadata fetch)
│   │   ├── useContentEditor.ts         # Content editing logic
│   │   ├── AppearanceTab.tsx           # Appearance UI
│   │   ├── GeneralTab.tsx              # General settings UI
│   │   ├── DataTab.tsx                 # Data backup UI (with bookmark import)
│   │   └── SecurityTab.tsx             # Security UI
│   ├── BackgroundLayer.tsx             # Background rendering
│   ├── CategoryNav.tsx                 # Nav bar (desktop island + mobile drawer)
│   ├── CommandPalette.tsx              # Command palette (Ctrl+K fuzzy search)
│   ├── GlassCard.tsx                   # Glass card component
│   ├── SearchBar.tsx                   # Multi-engine search
│   ├── SmartIcon.tsx                   # Icon (scaling + fallback)
│   ├── Footer.tsx                      # Footer
│   ├── SkeletonLoader.tsx              # Skeleton loader
│   ├── SyncIndicator.tsx               # Sync status
│   ├── IconPicker.tsx                  # Icon picker
│   └── Toast.tsx                       # Toast notifications
├── hooks/
│   ├── useDashboardLogic.ts            # Core business logic (incl. most-visited)
│   ├── useThemeColor.ts                # Theme color + dark class management
│   ├── useViewportScale.ts             # Viewport scale factor
│   ├── useResponsiveColumns.ts         # Responsive columns
│   ├── useCategoryDragDrop.ts          # Drag & drop
│   └── useAuth.ts                      # Auth state
├── services/
│   ├── apiClient.ts                    # API client (intercept / retry / silent refresh)
│   ├── queries.ts                      # TanStack Query hooks
│   └── storage.ts                      # LocalStorage read/write + import/export
├── contexts/
│   └── LanguageContext.tsx             # i18n Context
├── locales/
│   ├── en.json                         # English translations
│   └── zh.json                         # Chinese translations
├── constants/
│   └── defaults.ts                     # Default value constants
├── types/
│   ├── index.ts                        # Shared type definitions
│   └── errors.ts                       # ApiError class
├── utils/
│   ├── color.ts                        # Background dominant color extraction
│   ├── errorHandler.ts                 # Error code → user message mapping
│   ├── favicon.ts                      # Favicon URL generation
│   ├── fuzzyMatch.ts                   # Fuzzy matching (prefix/contiguous bonus)
│   ├── parseBookmarks.ts              # Browser bookmark HTML parser
│   ├── parseMetadata.ts               # HTML metadata extraction (title/desc/icon)
│   └── pinyinInitials.ts              # Chinese character → pinyin initial mapping
├── App.tsx                             # Root component
├── constants.tsx                       # Search engines etc.
├── index.tsx                           # Entry (routing + React.lazy code-splitting)
└── index.css                           # Global styles + theme tokens
```

## License

MIT

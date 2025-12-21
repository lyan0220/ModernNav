
# ModernNav - Personal Navigation Dashboard

ModernNav is a modern, minimalist, card-based navigation dashboard featuring a frosted glass (Glassmorphism) aesthetic. It is designed to be a beautiful, customizable browser start page or bookmark manager.

Built with **React**, **Tailwind CSS**, and **Cloudflare Pages** (Functions + D1 Database).

[中文文档](README.md) | [📅 Roadmap](ROADMAP.md)

## ✨ Features

*   **🎨 Stunning UI:** Glassmorphism design with adaptive frosted glass effects, smooth animations, and responsive layout.
*   **🌓 Dark/Light Mode:** Automatic theme switching with intelligent color extraction from background images.
*   **🖱️ Drag & Drop:** Easily reorder categories and links via drag and drop in the settings.
*   **🖼️ Customization:** Change background images, adjust blur/opacity levels, and customize theme colors.
*   **📂 Grouping:** Organize links into Categories and Sub-categories (Folders).
*   **🔍 Aggregated Search:** Integrated search bar supporting Google, Bing, Baidu, GitHub, and more.
*   **🔐 Stateless Security:** Implements **Stateless Dual Token Authentication** (HMAC-Signed). Sessions require **zero database writes**, using D1 only for storing the admin code, while maintaining maximum security via HttpOnly Cookies and token rotation against XSS/CSRF.
*   **🛡️ Robust Data Handling:** Built-in strict type validation and automatic error recovery prevent application crashes (White Screen of Death) caused by malformed data structure updates.
*   **☁️ Smart Hybrid Storage:**
    *   **Read Strategy (Network First):** Prioritizes fetching the latest data from the cloud, automatically falling back to local cache if offline, ensuring instant loading and offline availability.
    *   **Write Strategy (Optimistic UI):** Changes are applied immediately to the interface without waiting for server response, while silently syncing to Cloudflare D1 in the background for a smooth experience.
*   **🌍 Internationalization:** Built-in support for English and Chinese (Simplified).
*   **💾 Full Backup:** Export your entire configuration (links, background, settings) to JSON and restore anytime.

## 🛠️ Tech Stack

*   **Frontend:** React 19, Vite, Tailwind CSS, Lucide React
*   **Backend:** Cloudflare Pages Functions (Serverless)
*   **Database:** Cloudflare D1 (Serverless SQL Database)
*   **Auth:** Stateless JWT (HMAC-SHA256) + HttpOnly Cookie
*   **Language:** TypeScript

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or later)
*   npm or yarn

### 1. Installation

```bash
npm install
```

### 2. Local Development (Frontend Only)

If you only want to work on the UI (uses LocalStorage):

```bash
npm run dev
```

### 3. Local Development (Full Stack with Cloudflare)

To test the Backend API and D1 storage locally, you need `wrangler`.

1.  Install Wrangler:
    ```bash
    npm install -D wrangler
    ```

2.  Initialize local database schema (using the SQL file):
    ```bash
    npx wrangler d1 execute modern-nav-db --local --file=./schema.sql
    ```

3.  Run the Cloudflare Pages simulation:
    ```bash
    npx wrangler pages dev . --d1 DB=modern-nav-db
    ```
    *This simulates the Cloudflare environment locally.*

## 📦 Deployment (Cloudflare Pages)

This project is optimized for **Cloudflare Pages**.

### Step 1: Push to Git
Push this code to your GitHub or GitLab repository.

### Step 2: Create Cloudflare Project
1.  Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2.  Go to **Workers & Pages** > **Overview** > **Create Application** > **Pages** > **Connect to Git**.
3.  Select your repository.

### Step 3: Build Settings
*   **Framework preset:** `None`
*   **Build command:** `npm run build`
*   **Build output directory:** `dist`

### Step 4: Configure Database (D1)
1.  After the project is created, go to **Workers & Pages** > **D1**.
2.  Click **Create** to create a database (e.g., `modern-nav-db`).
3.  Go to the database **Console** tab.
4.  Open `schema.sql` in your project, copy the content, paste it into the console, and click **Execute**.
5.  Go back to your Pages project settings: **Settings** > **Functions** > **D1 Database Bindings**.
6.  Add a binding:
    *   **Variable name:** `DB` (Must be exact)
    *   **D1 Database:** Select the namespace you created.
7.  **Save** and **Redeploy** (Go to Deployments > Retry deployment).

## ⚙️ Configuration & Usage

### Initial Setup
1.  Open your deployed site.
2.  Click the **Settings (Gear Icon)** in the top right.
3.  Enter the default access code: `admin`.
4.  **Important:** Go to the "Security" tab immediately and change your access code.

### Customization
*   **Content:** Add categories and links in the "Content" tab. Reorder them using drag and drop.
*   **Appearance:** Change the background URL and adjust card opacity in the "Appearance" tab.

## 📂 Project Structure

```
├── components/        # React UI components
│   ├── GlassCard.tsx  # Glassmorphism card component
│   ├── LinkManagerModal.tsx  # Link management modal
│   ├── SearchBar.tsx  # Search bar component
│   ├── SyncIndicator.tsx  # Sync status indicator
│   └── Toast.tsx      # Toast notification component
├── contexts/          # React Contexts
│   └── LanguageContext.tsx  # Internationalization context
├── functions/api/     # Cloudflare Pages Functions (Backend API)
│   ├── bootstrap.ts   # Initial data load (Read D1)
│   ├── update.ts      # Data save (Write D1)
│   ├── auth.ts        # Authentication API endpoint (handles login, token refresh, etc.)
│   ├── health.ts      # Health check endpoint
│   └── utils/         # API utility library
│       ├── authHelpers.ts  # Authentication utilities (encryption, verification, rate limiting, etc.)
│       ├── logger.ts  # Logging utilities
│       └── validation.ts  # Data validation utilities
├── services/          # Service layer
│   └── storage.ts     # Data storage service
├── utils/             # Utility functions
│   └── color.ts       # Color processing utilities
├── schema.sql         # Database initialization script (SQL)
├── constants.tsx      # Constants definitions
├── types.ts           # TypeScript type definitions
└── ROADMAP.md         # Development roadmap
```

## 📄 License

MIT License. Feel free to use and modify for personal use.

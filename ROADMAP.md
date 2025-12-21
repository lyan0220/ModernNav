# ModernNav Development Roadmap

This document outlines the development plan for ModernNav, focusing on stability, feature enhancement, and architectural improvements.

## 🧭 Phase 1: Stability & Foundation (Current Focus)
**Goal:** Ensure the application is robust, secure, and easy to deploy.

- [x] **Core UI:** Glassmorphism design, responsive layout, drag & drop.
- [x] **Backend Integration:** Cloudflare D1 + Functions implementation.
- [x] **Security:** Stateless JWT + HttpOnly Cookies.
- [x] **Data Safety:** Optimistic UI updates with background syncing.
- [ ] **Bug Fixes:** Address potential race conditions in drag-and-drop on mobile devices.
- [ ] **Error Handling:** Improve visual feedback for specific D1 connection errors.

## 🚀 Phase 2: User Experience Enhancements (Short Term)
**Goal:** Make the dashboard more personal and customizable.

### 2.1 Customization Deep Dive
- **Custom Search Engines:** Allow users to add/edit search providers (currently hardcoded).
- **Font Settings:** Option to switch between different font families.
- **Theme Presets:** Provide 5-6 expertly curated color/blur presets beyond the auto-extracted one.

### 2.2 Interface Improvements
- **Right-Click Menu:** Context menu for cards (Edit, Delete, Open in New Tab) for faster management.
- **Mobile Experience:** Improve the touch targets and drag-and-drop feel on iOS/Android.
- **Icon Picker:** Integrate a larger icon set or allow custom SVG uploads.

## 🛠️ Phase 3: Advanced Features (Medium Term)
**Goal:** Expand utility beyond a simple link manager.

### 3.1 Widgets System
- **Weather Widget:** Simple current weather display based on IP location.
- **Clock/Date:** Customizable clock styles.
- **Note Scratchpad:** A simple text area for temporary notes, synced to D1.

### 3.2 Data Management
- **Cloud Backup History:** Keep the last 3 auto-backups in D1 to allow rollback of accidental changes.
- **Import from Browser:** Ability to parse an exported Chrome/Edge bookmarks HTML file.

## 🏗️ Phase 4: Architecture & Scalability (Long Term)
**Goal:** Prepare the codebase for open-source contributions and scale.

- **PWA Support:** Add `manifest.json` and Service Workers for "Install to Home Screen" functionality.
- **Testing:**
  - Unit tests for `storage.ts` logic.
  - E2E tests using Playwright to verify the Drag & Drop flows.
- **Multi-User Support (Optional):** Refactor the `config` table to support `user_id` for multi-tenant deployments.

---

## 📝 Contribution Guide
We welcome contributions! Please follow the standard Pull Request workflow:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes.
4. Push to the branch.
5. Open a Pull Request.

# visit_count 兑现 + HTML 书签导入 设计文档

> 日期：2026-07-03
> 阶段：阶段四 · 第一档（最后两项）

---

## Feature 1: visit_count 兑现

### 目标

将 D1 中已有的 `visit_count` 死字段激活：点击链接时静默递增计数，前端生成「最近常用」虚拟分类置顶展示高频链接。不在卡片上显示角标数字。

### 后端：`POST /api/visit`

新建 `functions/api/visit.ts`，导出 `onRequestPost`。

- **请求体**：`{ linkId: string }`
- **认证**：无需认证（访客点击也应计数）
- **SQL**：`UPDATE links SET visit_count = visit_count + 1 WHERE id = ?`
- **响应**：204 No Content（sendBeacon 不消费响应体）
- **速率限制**：不做——每次点击触发一次，频率天然有限
- **错误处理**：linkId 不存在时静默忽略（不影响用户体验）

### 后端：读取通路

`functions/api/utils/reads.ts` 的 `readAllCategories()` 查询加上 `visit_count` 列。返回值通过 bootstrap 传递到前端。

### 与 diff 引擎的关系

`visit_count` 完全独立于 diff 引擎：

- `diffCategories()` 不对比 `visit_count` 字段
- `applyCategoryDiff()` 的 INSERT/UPDATE 语句不包含 `visit_count`（新链接使用 schema 默认值 0）
- 分类编辑保存时不会覆盖 `visit_count`

### 类型变更

`src/types/index.ts` 的 `LinkItem` 新增：

```typescript
export interface LinkItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  icon?: string;
  visitCount?: number;  // 新增
}
```

可选字段，前端 only 模式（无 D1）时为 undefined。

### 前端：点击计数

`GlassCard` 组件（`src/components/GlassCard.tsx`）：当 `href` 存在时添加 `onClick`：

```typescript
navigator.sendBeacon("/api/visit", JSON.stringify({ linkId }));
```

不 `preventDefault`，浏览器原生导航继续。`GlassCard` 需要新增一个 `linkId` prop。

`CommandPalette.tsx`：在 `window.open(link.url, "_blank")` 之前同样 sendBeacon。

### 前端：「最近常用」虚拟分类

在 `useDashboardLogic` 中计算：

1. 从 bootstrap 数据遍历所有链接，筛选 `visitCount > 0`
2. 按 `visitCount` 降序排序，取 Top N
3. 构造一个虚拟 `Category` 对象（固定 id 如 `__frequent__`），包含一个 SubCategory，items 为 Top N 链接
4. 根据配置决定是否置顶插入到分类列表前面

此虚拟分类不写入 D1，纯前端运行时计算。

### 用户配置

新增 prefs 字段：

```typescript
frequentLinks?: {
  enabled: boolean;   // 默认 true
  count: number;      // 默认 10
  pinToTop: boolean;  // 默认 true
}
```

存储在 `config` 表 `prefs` KV 中，通过现有的 `useUpdatePrefs` 写入。

admin General 设置页新增「常用链接」配置区块：启用开关、数量选择（5/10/15/20）、置顶开关。

### 前端不展示角标

卡片 UI 不做任何视觉变化。`visitCount` 仅用于虚拟分类排序。

---

## Feature 2: HTML 书签导入

### 目标

解析浏览器导出的 `bookmarks.html` 文件，将书签文件夹树映射为 ModernNav 的 Category/SubCategory/Link 结构并追加导入。冷启动决定性功能。

### 解析器：`src/utils/parseBookmarks.ts`

纯函数 `parseBookmarksHtml(html: string): Category[]`：

1. `new DOMParser().parseFromString(html, "text/html")` 得到 DOM
2. 递归遍历 `<DL>` 列表：
   - `<DT>` 下包含 `<H3>` → 文件夹
   - `<DT>` 下包含 `<A href="...">` → 链接
3. 层级映射：
   - 第一层文件夹 → `Category`
   - 第二层文件夹 → `SubCategory`
   - 第三层及更深 → 链接平坦化到最近的 `SubCategory`
4. 特殊处理：
   - 跳过浏览器内置文件夹名（Bookmarks Bar / 书签栏 / Bookmarks Toolbar / Other Bookmarks / 其他书签等）作为容器层，保留子内容直接提升
   - 顶层散落链接（不在任何文件夹中）→ 归入自动生成的「未分类书签」/「Uncategorized」分类（跟随 `useLanguage` 当前语言）
   - 忽略 `javascript:` 和 `data:` 协议的链接
5. ID 生成：`${Date.now()}-cat-${i}` / `${Date.now()}-sub-${i}-${j}` / `${Date.now()}-link-${i}-${j}-${k}`

### 导入策略

追加模式：解析后的 `Category[]` 拼接到现有分类数组末尾。不做同名合并、不做 URL 去重。用户导入后自行整理。

### DataTab UI

在 `src/components/settings/DataTab.tsx` 现有「导入/恢复」区域新增：

- 「导入浏览器书签」按钮，与 JSON 恢复按钮并列
- 独立的 `<input type="file" accept=".html,.htm" className="hidden">`
- 点击按钮 → 触发 file input → onChange 读取文件 → 调用 `parseBookmarksHtml`

### DataPage 集成

`src/components/admin/DataPage.tsx` 新增 `onImportBookmarks` 回调：

1. 接收解析后的 `Category[]`
2. 将其拼接到现有 `categories` 末尾
3. 调用 `updateCategories.mutate(merged)`

### 确认与反馈

- 解析成功后，弹出确认对话框（modal）：「即将导入 X 个分类、Y 个链接，确认？」
- 用户点击确认后执行导入，完成后显示成功 Toast
- 文件无法解析或不含 `<DL>` → 错误提示「不是有效的书签文件」
- 解析出 0 个链接 → 提示「书签文件中未找到链接」

### 测试

`src/utils/__tests__/parseBookmarks.test.ts`：

- Chrome 导出格式解析（标准 `<DL><DT><H3>...<DL><DT><A>` 结构）
- Firefox 导出格式解析
- 深层嵌套（3+ 层）平坦化
- 顶层散落链接归入「未分类」
- 空文件 / 无链接文件
- `javascript:` 链接过滤
- 浏览器内置文件夹跳过

---

## 不在范围内

- 卡片角标 / 热力色 / 任何 visit_count 视觉展示
- 书签导入的同名合并或 URL 去重
- 书签导入预览/勾选界面
- visit_count 重置功能（未来可在 admin 加）
- 其他格式的书签导入（如 JSON 书签、Safari plist）

---

## 涉及文件清单

### visit_count

| 文件 | 变更类型 |
|------|---------|
| `functions/api/visit.ts` | 新建 |
| `functions/api/utils/reads.ts` | 修改（SELECT 加 visit_count） |
| `src/types/index.ts` | 修改（LinkItem 加 visitCount） |
| `src/components/GlassCard.tsx` | 修改（onClick sendBeacon） |
| `src/components/CommandPalette.tsx` | 修改（sendBeacon） |
| `src/hooks/useDashboardLogic.ts` | 修改（虚拟分类计算） |
| `src/components/settings/GeneralTab.tsx` | 修改（常用链接配置区块） |
| `src/types/index.ts` | 修改（UserPreferences 加 frequentLinks） |

### 书签导入

| 文件 | 变更类型 |
|------|---------|
| `src/utils/parseBookmarks.ts` | 新建 |
| `src/utils/__tests__/parseBookmarks.test.ts` | 新建 |
| `src/components/settings/DataTab.tsx` | 修改（新增导入按钮） |
| `src/components/admin/DataPage.tsx` | 修改（新增 onImportBookmarks 回调） |

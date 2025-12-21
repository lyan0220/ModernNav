# 字体文件下载说明

本项目使用 Inter 字体，为了完全本地化，需要手动下载字体文件。

## 下载步骤

1. 访问 Google Fonts 的 Inter 字体页面：https://fonts.google.com/specimen/Inter

2. 下载以下字体权重的 WOFF2 格式文件：
   - 300 (Light)
   - 400 (Regular)
   - 500 (Medium)
   - 600 (SemiBold)
   - 700 (Bold)

3. 创建 `public/fonts` 目录
4. 将下载的文件重命名并放置到 `public/fonts` 目录下：
   - 300 权重 -> `inter-v20-latin-300.woff2`
   - 400 权重 -> `inter-v20-latin-regular.woff2`
   - 500 权重 -> `inter-v20-latin-500.woff2`
   - 600 权重 -> `inter-v20-latin-600.woff2`
   - 700 权重 -> `inter-v20-latin-700.woff2`

## 替代方案

如果您不想手动下载字体文件，可以使用以下替代方案：

1. 使用 npm 安装字体包：
```bash
npm install inter-ui
```

2. 然后更新 `public/fonts.css` 文件，使用本地安装的字体文件：
```css
@import url('~inter-ui/inter.css');
```

## 注意事项

- 确保字体文件已正确放置在 `public` 目录下
- 字体文件名必须与 `public/fonts.css` 中引用的文件名完全匹配
- 如果您使用的是其他字体，请相应地更新 `public/fonts.css` 和 `tailwind.config.js` 中的字体配置

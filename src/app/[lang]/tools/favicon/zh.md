# Favicon 图标生成工具使用说明

Favicon 是网站在浏览器标签页、收藏夹、搜索结果、手机主屏幕和 PWA 安装入口中显示的小图标。一个完整的网站图标包通常不只是 `favicon.ico`，还需要多个 PNG 尺寸、`apple-touch-icon.png`、Android 图标、`site.webmanifest` 和 HTML 引用代码。

这个在线 Favicon 生成工具支持上传 PNG、JPG 或 WebP 图片，并在浏览器本地生成常见网站图标文件。你可以选择铺满裁切或完整保留图片，设置透明背景或纯色背景，调整图标留白，然后一次性下载 ZIP 包。

## 怎么生成 favicon.ico 和网站图标

1. 上传一张 PNG、JPG 或 WebP 图片。
2. 选择适配方式：Logo 图标通常适合“铺满裁切”，完整图形适合“完整保留”。
3. 如果源图没有透明背景，可以选择纯色背景。
4. 调整留白比例，让图标在小尺寸下不贴边。
5. 点击“生成 Favicon”。
6. 下载单个文件，或点击“下载全部 ZIP”拿到完整网站图标包。

## 生成的文件包含什么

- `favicon.ico`：包含 16×16、32×32、48×48 三种尺寸，兼容传统浏览器和部分旧系统。
- `favicon-16x16.png`、`favicon-32x32.png` 等多尺寸 PNG：用于现代浏览器和不同显示密度。
- `apple-touch-icon.png`：用于 iPhone、iPad 添加到主屏幕时显示。
- `android-chrome-192x192.png` 和 `android-chrome-512x512.png`：用于 Android、Chrome 和 PWA。
- `site.webmanifest`：提供 Web App 图标配置。
- `favicon-html-snippet.txt`：包含可复制到网站 `<head>` 中的图标引用代码。

## 什么图片适合做 Favicon

Favicon 通常显示得很小，16×16 和 32×32 是最常见的浏览器标签页尺寸。因此图标需要足够简洁，边缘清晰，主体居中。建议使用正方形 Logo、品牌图标、单个字母图标或高对比度图形。复杂照片、长文字、细线条和背景过于复杂的图片，在小尺寸下通常会看不清。

如果你的 Logo 本身不是正方形，可以使用“完整保留”模式并增加留白；如果你希望图标占满画面，可以使用“铺满裁切”模式。

## 隐私说明

图片读取、缩放、裁切、ICO 生成、PNG 导出和 ZIP 打包都在浏览器本地完成，不上传服务器。适合处理公司 Logo、个人网站图标、项目图标和未公开的品牌素材。

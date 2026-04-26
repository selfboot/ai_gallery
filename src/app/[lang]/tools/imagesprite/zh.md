# CSS Sprite 雪碧图生成工具使用说明

CSS Sprite 雪碧图是把多张小图标合并到一张大图里，然后通过 CSS 的 `background-position` 显示其中某一个图标。这样可以减少图片请求数量，适合前端项目里的小图标、按钮状态图、小游戏素材、UI 小图和静态装饰图。

这个工具的输入是多张独立图片，例如 `home.png`、`search.png`、`user.png`、`settings.png`。工具会把它们合成为一张 `sprite.png`，并同时生成 `sprite.css` 和 `sprite.json`。它不是“上传一张已有雪碧图再自动切分”，因此坐标不是靠识别推测出来的，而是生成时直接计算并写入，能够做到像素级准确。

## 怎么生成雪碧图

1. 上传多张 PNG、WebP 或 JPG 图片。
2. 选择布局方式：网格、横向或纵向。
3. 设置图片间距，避免图标之间贴得太近。
4. 设置 CSS class 前缀，例如 `icon`，最终会生成 `.icon-home` 这类 class。
5. 如果使用 2x 或 3x 高清图标，可以设置高清倍率，CSS 会自动换算显示尺寸和 `background-size`。
6. 点击“生成雪碧图”，下载 ZIP 包。

## 输出文件说明

- `sprite.png`：合成后的雪碧图图片。
- `sprite.css`：可直接使用的 CSS class，包含 `width`、`height`、`background-image`、`background-position`。
- `sprite.json`：结构化坐标 manifest，适合在构建脚本、游戏引擎、Canvas 或自定义前端组件中使用。

## 坐标为什么准确

工具生成雪碧图时，会先读取每张图片的原始宽高，再根据布局规则计算 `x`、`y`、`width`、`height`。随后使用同一组坐标把图片绘制到 canvas 上，并用同一组坐标生成 CSS 和 JSON。

也就是说，`sprite.png` 里的图标位置和 `sprite.css` / `sprite.json` 里的坐标来自同一份数据，不是后期识别，因此不会出现识别偏差。

## 适合什么场景

- 前端项目减少小图标请求数。
- 老项目维护 CSS Sprite。
- 游戏或 Canvas 项目合并小素材。
- 导出图标坐标给构建脚本或自定义 UI 组件。
- 把一批 PNG / WebP 小图标整理成统一资源包。

## 隐私说明

图片读取、排版、合成、CSS 生成、JSON 生成和 ZIP 打包都在浏览器本地完成，不上传服务器。

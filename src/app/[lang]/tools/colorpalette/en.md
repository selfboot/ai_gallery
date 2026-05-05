# How to Use the Image Color Palette Extractor

This online image color palette extractor finds dominant colors from an image and outputs HEX, RGB, HSL, and CSS variables. It is useful for designers, frontend developers, marketers, brand teams, and content creators who need colors from posters, product photos, screenshots, logos, banners, social media covers, or website previews.

Image reading and color analysis run locally in your browser. Your image is not uploaded to a server, which makes the tool suitable for unpublished designs, product screenshots, internal brand assets, and campaign material.

## Supported Color Formats

- HEX: for example `#2F80ED`, useful for Figma, CSS, design specs, and brand color records.
- RGB: for example `rgb(47, 128, 237)`, useful for CSS, Canvas, and design tools.
- HSL: for example `hsl(214, 85%, 56%)`, useful when adjusting hue, saturation, and lightness.
- CSS variables: for example `--palette-1: #2F80ED;`, ready to paste into a frontend project.
- JSON: download the full palette data for reuse, documentation, or scripts.

## Steps

1. Upload a PNG, JPG, WebP, GIF, or BMP image.
2. The tool extracts dominant colors and shows each color percentage.
3. Click a color value to copy HEX, RGB, or HSL.
4. Adjust the number of colors to extract more or fewer palette entries.
5. Adjust the sample step: smaller values are more detailed, larger values are faster.
6. Set a CSS variable prefix, then copy all CSS variables or download JSON.

## Common Use Cases

Image palette extraction helps collect brand colors from a logo, reuse colors from marketing posters, build ecommerce product color themes, extract UI colors from screenshots, and generate frontend theme variables. It is also useful for Xiaohongshu covers, WeChat article covers, Twitter/X headers, YouTube thumbnails, and OpenGraph images when you need matching text, background, button, or border colors.

## Why Extracted Colors May Differ from What You See

The tool samples pixels and groups similar colors into representative colors. Photos, gradients, shadows, antialiasing, transparent pixels, and compression noise can influence the result. You can increase the color count, reduce the sample step, or ignore transparent pixels to get a more useful palette.

For brand or UI design systems, treat the extracted palette as a starting point and fine-tune HEX values against your design guidelines.

# CSS Sprite Generator Guide

A CSS sprite combines multiple small images into one larger image. CSS then uses `background-position` to show one icon at a time. Sprites can reduce image requests and are useful for frontend icons, button states, game assets, small UI images, and static decoration images.

This tool takes multiple separate images as input, such as `home.png`, `search.png`, `user.png`, and `settings.png`. It merges them into `sprite.png` and generates `sprite.css` plus `sprite.json`. It does not split an existing sprite sheet, so coordinates are not guessed by image recognition. They are calculated while the sprite is generated, which makes them pixel-accurate.

## How to generate a sprite

1. Upload multiple PNG, WebP, or JPG images.
2. Choose a layout: grid, horizontal, or vertical.
3. Set the gap between images.
4. Set a CSS class prefix such as `icon`, which produces classes like `.icon-home`.
5. If you use 2x or 3x retina assets, set the retina scale so CSS dimensions and `background-size` are adjusted.
6. Click “Generate sprite” and download the ZIP package.

## Output files

- `sprite.png`: the generated sprite image.
- `sprite.css`: ready-to-use CSS classes with `width`, `height`, `background-image`, and `background-position`.
- `sprite.json`: a structured coordinate manifest for build scripts, game engines, Canvas, or custom UI components.

## Why the coordinates are accurate

The tool reads each image’s original width and height, calculates `x`, `y`, `width`, and `height` from the selected layout, draws each image to the canvas using those exact coordinates, and exports the same data to CSS and JSON.

That means `sprite.png`, `sprite.css`, and `sprite.json` all share one coordinate source. No visual detection is involved, so there is no recognition error.

## Common use cases

- Reduce small icon requests in frontend projects.
- Maintain CSS sprites in legacy projects.
- Combine small game or Canvas assets.
- Export icon coordinates for build scripts or custom UI components.
- Organize a batch of PNG / WebP icons into one asset package.

## Privacy

Image reading, layout, sprite generation, CSS generation, JSON generation, and ZIP packaging all run locally in your browser. Your images are not uploaded to a server.

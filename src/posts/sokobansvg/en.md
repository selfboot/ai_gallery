---
title: Best Use Cases for Claude3.5 - Optimizing Sokoban Level Thumbnails
date: '2024-12-18 20:00:00'
tags: ['claude', 'sokoban']
keywords: ['Claude3.5 Frontend Development', 'Canvas SVG Optimization', 'Free Online Sokoban']
description: A case study of optimizing Sokoban level thumbnails demonstrates Claude3.5's effectiveness in frontend development. From initial canvas implementation to device pixel ratio optimization, and finally to SVG solution, showcasing different stages of AI-assisted technical iterations.
---

My online Sokoban game has [numerous levels](https://gallery.selfboot.cn/en/games/sokoban/more), where the level thumbnails were initially generated using canvas. Since Claude3.5 generated most of the code, I didn't pay much attention to the thumbnail quality at first.

However, users later reported that the thumbnails appeared blurry. Upon closer inspection, they were indeed fuzzy, as shown below:

![Sokoban Level Canvas Thumbnails](https://slefboot-1251736664.file.myqcloud.com/20241218_ai_gallery_sokoban_blog.png)

If you can't notice the blurriness, don't worry - the contrast will become apparent when you see the clearer version later.

## Optimizing Thumbnails with Claude3.5

Not being a frontend expert, I wasn't sure how to improve this. So I directly asked Claude3.5:

> The canvas thumbnails are a bit blurry. How can I make them sharper with higher pixel density?

Claude3.5 confidently suggested improving the canvas thumbnail clarity by adjusting the canvas's actual dimensions using the device pixel ratio (devicePixelRatio). It immediately provided complete modification code.

The solution involved getting the device pixel ratio (devicePixelRatio), setting the canvas's actual dimensions to dpr times the display size, using scale to adjust the drawing context to match the device pixel ratio, and fixing the canvas's display size through CSS styles.

After applying these changes in Cursor, the refreshed page showed improved results:

![Optimized Sokoban Level Canvas Thumbnails](https://slefboot-1251736664.file.myqcloud.com/20241218_ai_gallery_sokoban_canvas_better.png)

Compared to the previous version, it was noticeably better. When I shared this with the user who reported the issue, they suggested using SVG instead, saying it would provide better results and allow lossless scaling.

## Optimizing Thumbnails with SVG

Out of curiosity, I asked Claude3.5:

> Could we use SVG instead of canvas here?
> 
> Would SVG be clearer?

Claude3.5 quickly provided SVG code, explaining that SVG would indeed be clearer since it's vector-based graphics.

The code changes exceeded expectations. Claude3.5 removed all canvas-related code, replaced it with SVG, used `<rect>` elements for each cell, maintained the same color scheme and scaling logic, and used SVG's stroke attribute for cell borders.

The clean code changes were committed in [commit 03cc29](https://github.com/selfboot/ai_gallery/commit/01c28d2401561e692a9ee384a16e0ad18703cc29), as shown below:

![Sokoban Level SVG Thumbnail Code Changes](https://slefboot-1251736664.file.myqcloud.com/20241218_ai_gallery_sokoban_svg_commit.png)

This SVG approach, compared to canvas, doesn't require handling device pixel ratio (DPR), is easier to debug and modify styles, and maintains clarity at any resolution since SVG is vector-based. The final result looks like this:

![Sokoban Level SVG Thumbnails](https://slefboot-1251736664.file.myqcloud.com/20241218_ai_gallery_sokoban_svg_better.png)

## Canvas vs SVG Comparison

After switching from canvas to SVG for my Sokoban game thumbnails, the improvement was significant. Both canvas and SVG have their strengths, suited for different scenarios.

Canvas is like a drawing board where we can paint various shapes. For example, this code draws a red circle:

```javascript
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

ctx.beginPath();
ctx.arc(50, 50, 40, 0, 2 * Math.PI);
ctx.fillStyle = 'red';
ctx.fill();
```

Once drawn, it's fixed like a photograph. To modify it, you need to redraw. When zoomed in, it becomes pixelated because Canvas is fundamentally pixel-based.

SVG is different - it's vector-based. Here's how to draw a red circle in SVG:

```javascript
<svg width="100" height="100">
  <circle cx="50" cy="50" r="40" fill="red"/>
</svg>
```

This circle remains sharp at any scale because the browser recalculates the rendering based on current dimensions. Plus, being in the DOM tree, its attributes like color and position can be modified anytime.

I've summarized the comparison between canvas and SVG:

| Feature | Canvas | SVG |
|---------|---------|-----|
| Rendering Method | Pixel-based bitmap rendering | Vector-based graphics rendering |
| Resolution Dependency | Resolution-dependent, blurry when scaled | Resolution-independent, infinitely scalable |
| Performance | Suitable for many objects (>1000)<br>Good for frequent redraws | Better for fewer objects (<1000)<br>Not ideal for frequent redraws |
| Memory Usage | Generally lower | Increases with DOM nodes |
| Event Handling | Requires manual hit detection | Native DOM event support |
| Animation Implementation | Erase and redraw, flexible control | CSS/SMIL animations, declarative |
| Shape Modification | Requires redrawing entire canvas | Can modify individual elements |
| Export and Printing | Direct image export | Can be copied, edited, and searched |

Use Canvas for game development, frequent redraws, or scenes with many graphic objects. Use SVG for icons, logos, or graphics that need clarity and occasional modifications.

## Best Use Cases for Claude3.5

For **small, well-defined changes like this one, with clear requirements**, Claude3.5 performs excellently. Whether optimizing canvas with device pixel ratio or implementing SVG thumbnails, it provided complete, working code changes that only needed straightforward acceptance.

However, it's worth noting that Claude3.5 might not proactively suggest solutions for your "**unknown unknowns**". Initially, when asked to optimize the thumbnails, it didn't mention SVG but instead improved the existing canvas solution. Once I knew about the SVG option, it quickly implemented it effectively.

Often, you need some knowledge base to know what exists, then Claude can provide specific implementations. Of course, using AI assistance can help quickly expand your knowledge and reduce "unknown unknowns". For instance, while making these changes, I learned about the differences between canvas and SVG and their best use cases through discussions with Claude3.5.

For future encounters with unfamiliar territory, it might be better to first ask Claude3.5 for different possible approaches and compare their pros and cons before choosing the best solution.
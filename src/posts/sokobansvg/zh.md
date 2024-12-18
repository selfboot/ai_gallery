---
title: Claude3.5 的最佳使用场景，以优化推箱子关卡的缩略图为例
date: '2024-12-18 20:00:00'
tags: ['claude', 'sokoban']
keywords: ['Claude3.5 辅助前端', 'canvas svg 优化', '在线免费推箱子']
description: 以推箱子游戏关卡缩略图优化为例，展示了 Claude3.5 在前端开发中的最佳应用场景。从最初使用 canvas 实现的模糊效果，到通过设备像素比优化，再到最终采用 svg 方案，展示了不同阶段 Claude3.5 的强带代码能力。
---

我的在线推箱子游戏有[超多关卡](https://gallery.selfboot.cn/zh/games/sokoban/more)，这里面的关卡缩略图，开始的时候是用 canvas 生成的。毕竟这里的代码都是 Claude3.5 生成的，我也没太注意缩略图这部分。

但是后面有用户反馈说缩略图看着很模糊，仔细看了下确实如此，如下图：

![推箱子游戏关卡 canvas 缩略图](https://slefboot-1251736664.file.myqcloud.com/20241218_ai_gallery_sokoban_blog.png)

如果看不出模糊的效果，没关系，等看到后面清晰的再回过来看，有对比就有伤害了。

## Claude3.5 优化缩略图

自己不是前端，也不太清楚这里要怎么优化，于是就直接问 Claude3.5：

> 这里的 canvas 缩略图有点模糊，怎么让它像素高些，清晰点

Claude3.5 信心满满，说要提高 canvas 缩略图的清晰度，可以使用设备像素比(devicePixelRatio)来调整 canvas 的实际尺寸。一下子就给出了完整的修改代码。

这里先获取设备像素比(devicePixelRatio)，将 canvas 的实际尺寸设置为显示尺寸的 dpr 倍，使用 scale 调整绘图上下文以匹配设备像素比，通过 CSS 样式固定 canvas 的显示尺寸。

Cursor 中应用变更后，刷新页面，效果好了些，如下图这样：

![推箱子游戏关卡 canvas 缩略图优化后](https://slefboot-1251736664.file.myqcloud.com/20241218_ai_gallery_sokoban_canvas_better.png)

和之前的版本对比，确实好不少。拿去给反馈的用户重新体验了下，反馈说还是模糊。并且建议我用 svg 实现，这样效果会更好，并且能无损放大缩小。

## Claude3.5 用 svg 优化缩略图

抱着试试的心态，就直接问 Claude3.5 ：

> 这里不用 canvas，生成 svg 的图可以吗？
>
> svg 会更清晰的

Claude3.5 很快给出了 svg 的代码，并解释说使用 SVG 会更清晰,因为 SVG 是矢量图形。

这次改动代码超预期，Claude3.5 移除了所有 canvas 相关的代码，使用 SVG 替代 canvas，每个格子用 `<rect>` 元素绘制，保持了相同的颜色方案和缩放逻辑，使用 SVG 的 stroke 属性来绘制格子边框。

一次改好的代码变更很清晰，提交在 [commit 03cc29](https://github.com/selfboot/ai_gallery/commit/01c28d2401561e692a9ee384a16e0ad18703cc29)，如下：

![推箱子游戏关卡 svg 缩略图代码改动](https://slefboot-1251736664.file.myqcloud.com/20241218_ai_gallery_sokoban_svg_commit.png)

这个方案相比 canvas 的方案，不需要处理设备像素比(DPR)，更容易调试和修改样式。并且由于 svg 是矢量图形，在任何分辨率下都能保持清晰。最后效果图如下：

![推箱子游戏关卡使用 svg 缩略图](https://slefboot-1251736664.file.myqcloud.com/20241218_ai_gallery_sokoban_svg_better.png)

## canvas 和 svg 的对比

我的推箱子游戏缩略图从 canvas 改成了 svg，效果确实好了很多。其实 canvas 和 svg 各有特点，分别适合不同的场景。

Canvas 就像一个画布，我们可以在上面画各种图形。比如下面的代码就画了一个红色的圆：

```javascript
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

ctx.beginPath();
ctx.arc(50, 50, 40, 0, 2 * Math.PI);
ctx.fillStyle = 'red';
ctx.fill();
```

画完之后就像一张照片一样固定下来了，要修改的话只能重新画。**放大的时候会变模糊，因为本质上 Canvas 是基于像素的位图**。

SVG 不一样，它是矢量图形。还是画一个红色的圆，代码是这样的：

```javascript
<svg width="100" height="100">
  <circle cx="50" cy="50" r="40" fill="red"/>
</svg>
```

这个圆可以随意放大缩小都不会模糊，因为浏览器会根据当前尺寸重新计算渲染。并且这个圆在 DOM 树里，可以随时修改它的属性，比如改变颜色、位置等。

我总结了下 canvas 和 svg 的对比，如下：

| 特性 | Canvas | SVG |
|------|---------|-----|
| 渲染方式 | 基于像素的位图渲染 | 基于矢量的图形渲染 |
| 分辨率依赖 | 依赖分辨率，放大会模糊 | 与分辨率无关，可无限缩放 |
| 性能表现 | 适合大量图形对象(>1000)的渲染<br>适合频繁重绘的场景 | 适合少量图形对象(<1000)的渲染<br>不适合频繁重绘 |
| 内存占用 | 一般较低 | 随 DOM 节点增加而增加 |
| 事件处理 | 需要自行实现点击检测 | 原生支持 DOM 事件 |
| 动画实现 | 擦除和重绘，控制灵活 | CSS/SMIL 动画，声明式 |
| 修改图形 | 需要重绘整个画布 | 可以单独修改某个元素 |
| 导出和打印 | 可以直接导出为图片 | 可以复制、编辑和搜索 |

如果是游戏开发，需要频繁重绘，或者有大量图形对象，就用 Canvas。如果是图标、Logo 这种需要清晰度的，或者图形不多但需要经常修改的，就用 SVG。

## Claude3.5 最佳使用场景

对于**本文这种明确的小改动，一旦给出清晰的提示**，Claude3.5 的效果还是很不错的。这里不管是第一次优化 canvas 的设备像素比，还是用 svg 来实现缩略图，都是一次就完全改动，只用无脑 accept 就行。

不过值得注意的是，对于自己“**未知的未知**“盲点知识，Claude3.5 有时候可能不会主动提到。比如我开始让它优化这里缩略图，它并没有直接提到用 svg，而是在现有 canvas 方案的基础上做出优化。而一旦我知道 svg 方案更好，它确实能很快的实现。

很多时候，需要你有一定的知识储备，知道有这么个东西，然后才能让 Claude 给出具体实现。当然，使用 AI 辅助，也可以帮助自己快速的扩展知识面，尽量减少“未知的未知”。比如在改动代码的时候，我也追问了 Claude3.5，大概知道了 canvas 和 svg 的区别，以及它们各自的最佳使用场景。

其实下次要是再遇见一些自己未知领域的问题，可以先尝试让 Claude3.5 给出不同的方案，并且比较各自的优缺点，然后来选择具体使用哪个方案会更好些。
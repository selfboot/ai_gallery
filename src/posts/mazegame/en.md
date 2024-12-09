---
title: Online Maze Game, How To Make Claude Understand and Optimize the Existing Library
date: '2024-12-09 22:00:00'
tags: ['claude']
keywords: ['Claude3.5 Cursor Programming Assistant', 'Online Free Maze Generation', 'Online Maze Game']
description: Using Cursor and Claude3.5, I built a complete maze game based on an existing maze library. It supports various online maze generation and allows playing maze games with mouse control.
---

Over the weekend, I used Cursor and Claude3.5 to create a complete maze game based on an existing maze generation library. You can try it at [Maze Game, Online Maze Generation](https://gallery.selfboot.cn/zh/games/maze). It has comprehensive features, supporting various types of maze map generation and online maze gameplay using mouse controls.

![Online Maze Game, Generate Various Maze Maps](https://slefboot-1251736664.file.myqcloud.com/20241209_ai_gallery_maze_blog.png)

Previously, when having Claude write code, I used well-known libraries with detailed documentation. AI models were already trained on these libraries, making it easy to write code. However, this time, I used a [relatively obscure maze generation library](https://github.com/codebox/mazes) without documentation. Since the AI model had no knowledge of this library, getting AI to use it for my task was challenging.

## Letting AI "See" the Code Directly

Since this was a library unknown to AI, the simplest approach was to let AI "see" the code directly. I copied the entire maze library into the project and showed the files to AI one by one, asking it to summarize each file's basic function. This also helped me quickly understand the library's implementation principles.

From the subsequent usage experience, **only when you have a general understanding of the entire library's implementation can you provide correct hints to AI at crucial moments to solve encountered problems**.

After feeding the library to AI, I could start coding. I told Claude the requirements, and AI quickly provided the first version. I must say, the overall effect was good, better than expected. Of course, there were several issues, and I'll share two typical problems that everyone using AI for coding has likely encountered.

## Claude's Hallucination: Inventing a Parameter Name

When generating mazes, we support setting random seeds. For the same random seed and map configuration, the generated maze should be identical each time. However, in Claude's implementation, even though a random seed was set, the generated mazes were always different.

The simplest way to debug such issues is to add logs, and **Claude3.5 is now smart enough to actively suggest adding logs for troubleshooting**. Sometimes it even helps add logs in relevant positions, and you can provide the log output to AI, which will adjust the code based on the logs.

Here, after adding logs in the library code before using the random seed, we found that the output seed was changing each time, not using our set seed. It seemed there was an issue with our maze parameter settings. Here's the relevant code:

```javascript
  const config = {
    element: canvasRef.current,
    grid: {
      cellShape: settings.shape,
      width: parseInt(settings.width),
      height: parseInt(settings.height),
      layers: parseInt(settings.layers),
    },
    algorithm: settings.algorithm,
    exitConfig: settings.exitConfig || EXITS_HARDEST,
    random: numericSeed,
    lineWidth: 2,
  };
```

The random number parameter used was 'random', but checking the library code revealed it should be 'randomSeed'.

This is a **typical AI hallucination issue**. Although recent versions are much better than initial releases, hallucinations still exist. Especially when the AI hasn't seen a library during training, **inventing parameter names and function names is still a common problem**. However, such issues are relatively easy to solve by diving a bit deeper into the code.

## Claude's Logical Reasoning Deficiencies

The second issue is more common - typical code logic problems, which are harder to solve. **Even with Claude3.5, which feels strongest at writing code currently, there can be various deficiencies in implementing simple logic when the code gets longer**.

In the provided maze library, there's a method to find a path from the maze's start to its end. In this page's implementation, I wanted AI to provide a button to display the path, which would show the complete path when clicked.

Claude3.5 provided a decent implementation, adding the button and implementing related callbacks, looking perfect. However, when running it, no path was generated, and checking the console showed no errors.

Then it was time to debug again. With AI's assistance, it was easy to find where the path generation implementation was in the maze library. After adding logs to the path generation code, we found **the path was generated correctly but just wasn't rendering in the maze**.

![No Path Displayed in Maze](https://slefboot-1251736664.file.myqcloud.com/20241209_ai_gallery_maze_path.png)

Since path generation worked fine, the problem must be in the maze rendering. Looking at the maze generation code, we saw `maze.render()` being called for rendering. Should we also call `maze.render()` after generating the path? Asked Claude, who gave an affirmative answer and then explained the overall rendering logic.

In daily use, you'll occasionally encounter similar issues where AI can't find the solution on its own. You need to think of ways to debug, provide some ideas, and then AI can help finish the work like a Monday morning quarterback.

## Claude3.5 Optimizing Existing Projects

The above two problems were relatively easy to solve as they used existing maze library functionality. But could AI implement features not supported by the maze library?

In the existing maze library, to find a path, you need to use arrow keys or click to specify the movement path. For complex mazes, constantly clicking can be tiring. **Could we control the exploration direction in the maze by following mouse movement?**

### Simple Version of Mouse Hover Movement

Claude3.5's first version utilized existing maze library interfaces. It replaced the click-based movement logic with mouse hover movement logic. Each time the mouse moves, it calculates the mouse position and uses `getClosestDirectionForClick` to determine the movement direction. Here's the core code:


```javascript
const x = event.clientX - rect.left;
const y = event.clientY - rect.top;

const clickEvent = {
  rawCoords: [x, y]
};

const direction = maze.getClosestDirectionForClick(playState.currentCell, clickEvent);
```

In Claude's implementation, to prevent movement triggering with every mouse movement, a time interval was added. Movement only triggers every 200ms.

This implementation doesn't feel good in practice. Sometimes in the same cell, an accidental mouse shake might move the maze character to an opposite cell, making control not smooth.

### Optimized Version of Mouse Hover Movement

The ideal implementation should determine which maze cell the mouse is over whenever the mouse position changes. If the mouse moves to an adjacent cell that's accessible, move to that new cell. However, the maze library **doesn't have a ready-made method to convert mouse position to maze cells**.

Thinking carefully, the library should have this conversion logic somewhere, as it locates cells during clicks, just without exposed interfaces. So I directly showed Claude some maze code and asked how it converts page positions to maze cells.

Claude performed well, immediately finding the relevant code. In maze.js, each grid shape has its own click event handling logic to convert canvas coordinates to grid coordinates. For example, for square grids:

```javascript
defaultDrawingSurface.on(EVENT_CLICK, event => {
    const coords = [Math.floor(event.x), Math.floor(event.y)];
    if (grid.getCellByCoordinates(coords)) {
        eventTarget.trigger(EVENT_CLICK, {
            coords,
            rawCoords: [event.rawX, event.rawY],
            shift: event.shift,
            alt: event.alt
        });
    }
});
```

Other grid shapes have similar conversion logic. Of course, due to the complexity of network shapes, these conversions are correspondingly more complex.

Having found the conversion logic for each map shape, we just needed to extract this part and expose an external interface. This logic could then be used in mouse hover movement to determine which maze cell the mouse is over.

![Optimized Version of Mouse Hover Movement](https://slefboot-1251736664.file.myqcloud.com/20241209_ai_gallery_maze_mouseover.png)

After optimization, the experience improved significantly, allowing smooth maze movement following the mouse.

## Claude3.5 Maze Game Summary

As a developer unfamiliar with frontend development, with AI's help, I quickly built a complete maze game based on a niche open-source maze library. This wouldn't have been possible without AI's assistance, as I don't even know JavaScript syntax, which would have made development much slower. Without AI's help interpreting the open-source maze library, I might have gotten stuck on some implementation details.

Of course, throughout the implementation process, there were many aspects requiring personal thinking and debugging. These debugging approaches are core programming concepts and universal programming abilities. Although most code was written by Claude3.5, the entire process still exercised programming skills.

Finally, welcome to try the [Online Maze Game, Online Maze Generation](https://gallery.selfboot.cn/en/games/maze).
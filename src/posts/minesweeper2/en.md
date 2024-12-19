---
title: Building Minesweeper Game from Scratch with Claude3.5 - Hexagonal Mode
date: '2024-12-17 20:00:00'
tags: ['claude', 'minesweeper']
keywords: ['Frontend Development with Claude3.5', 'Minesweeper Game Development', 'Online Minesweeper Game']
description: Based on the complete grid minesweeper, a cellular version of minesweeper was implemented using Claude3.5 and Cursor. As long as you think clearly about the specific implementation ideas, and then divide the problems reasonably and prompt step by step, the code generated by Claude3.5 is mostly in line with expectations. When encountering complex problems, you can let Claude3.5 describe the general ideas first, and don't rush to write code, otherwise it is easy to be misled by wrong code and waste a lot of time.
---

In my previous article [Building a Minesweeper Game from Scratch with Claude3.5 - Basic Features](https://gallery.selfboot.cn/en/blog/minesweeper), I, as a frontend novice, managed to complete a basic Minesweeper game with Claude3.5's help. However, that was just a traditional square grid Minesweeper. Could Claude3.5 help implement a **hexagonal Minesweeper game**?

Let's first look at the result, which you can try at [Online Minesweeper Game](https://gallery.selfboot.cn/en/games/minesweeper):

![Hexagonal Minesweeper Map Implemented with Claude3.5](https://slefboot-1251736664.file.myqcloud.com/20241217_ai_gallery_minesweeper2_cover.png)

## Implementing Hexagonal Minesweeper with Claude3.5

Since we had already implemented the basic square grid Minesweeper and intelligently separated the logic, rendering, and UI components, implementing the hexagonal version could follow a similar approach. Additionally, considering that hexagonal Minesweeper shares many common operations with the square grid version, we can leverage Claude to reference the previous implementation for easy integration into our existing project.

So the first prompt was quite simple:

```
The current Minesweeper uses square cells. I want to support hexagonal cells.

Please help me implement the hexagonal Minesweeper logic part based on the current implementation, making it easy to integrate.
```

Of course, when prompting in Cursor, I also included the square grid Minesweeper code files as references, so Claude3.5 could refer to the previous implementation.

Though the prompt was simple, Claude3.5 understood it quite well. The response hit the key point: **the main difference in hexagonal grids is how adjacent cells are calculated**. It then helped create a new class HexMinesweeperGame to implement the hexagonal honeycomb logic:

```javascript
class HexMinesweeperGame {
  constructor(radius = 4, mines = 10) {
    this.radius = radius;
    this.mines = mines;
    this.gameOver = false;
    this.won = false;
    ...
```

Looking at the code, it met expectations. The core game logic like revealing cells and flagging operations were all there, with a new method for calculating adjacent cells. Of course, besides the logic part, we also needed corresponding rendering and UI components. So I continued with the prompt:

```
Based on the current Minesweeper, how can we add support for rendering hexagonal cells? Please help me implement it step by step, with maintainable code.
```

Claude first created a new renderer class HexRenderer to handle hexagonal cell drawing, then modified the GameBoard component to support hexagonal rendering. It even proactively added a button to switch between different map types, which I hadn't even mentioned.

Everything seemed to be going smoothly, with the overall implementation approach meeting my expectations. Similar to the square grid version, we added logic handling, rendering, and component parts. However, **with so many code changes at once, I didn't expect perfect results on the first try**. Sure enough, after refreshing the page and selecting hexagonal Minesweeper, the map showed no response, still displaying square cells, and clicking cells resulted in errors.

## Debugging Hexagonal Minesweeper with Claude3.5

When encountering errors, don't panic. Just give them to Claude3.5 - it should fix its own code issues. So I directly provided the basic error behavior and stack trace:

```
After selecting hexagonal Minesweeper, there's no response, still showing square cells.

And clicking results in error:
Uncaught TypeError: renderer.getHexCellFromPoint is not a function
    at handleClick (content.js:131:37)
    at HTMLUnknownElement.callCallback (react-dom.development.js:20565:14)
    at Object.invokeGuardedCallbackImpl (react-dom.development.js:20614:16)
    at invokeGuardedCallback (react-dom.development.js:20689:29)
    at invokeGuardedCallbackAndCatchFirstError (react-dom.development.js:20703:25)
    at executeDispatch (react-dom.development.js:32128:3)
    at processDispatchQueueItemsInOrder (react-dom.development.js:32160:7)
    at processDispatchQueue (react-dom.development.js:32173:5)
```

Claude was quite accurate in identifying the issue, directly telling me it was because the renderer switch wasn't handled correctly. After switching to hexagonal mode, we needed to use HexMinesweeperGame's logic, and it provided the modification solution.

There were some minor issues later, like some unimplemented methods in HexMinesweeperGame. When implementing a large amount of code at once, Claude3.5 often misses some implementations that might be needed later and need to be gradually added.

## Core Logic of Hexagonal Minesweeper

After fixing various small errors, clicking the hexagonal Minesweeper switch now showed a honeycomb pattern. Clicking also revealed cells, but there was a serious issue: the clicked cell and the revealed cell didn't match. As shown in the image, I clicked inside the red circle, but it revealed a cell several positions away.

![Hexagonal Minesweeper Map](https://slefboot-1251736664.file.myqcloud.com/20241217_ai_gallery_minesweeper2_hex.png)

It seemed there was an issue with cell positioning. This was much more complex than square grid positioning, where you could quickly determine the corresponding cell just by calculating coordinates. Hexagonal cell layout and positioning were considerably more complicated.

Initially, I hadn't thought through how to layout hexagons and how to map a pixel position to the corresponding cell. I just kept asking Claude3.5, trying to get it to solve the problem. It tried hard and gave various solutions, which I blindly tried, leading to various strange issues, like: half the honeycomb cells rendered, and clicking caused extra cells to appear. **This wasted quite a bit of time, and I almost gave up**.

### Asking Claude to Explain Implementation Approach

Later, still unwilling to give up, instead of just letting it write code, I asked it to explain the implementation approach, so I could think through how to implement the hexagonal Minesweeper. Prompt:

```
First tell me how to draw the honeycomb map here and manage the coordinate data.
```

Claude tried hard to explain, saying we could use an axial coordinate system to manage the hexagonal grid, with (0,0) as the center point expanding outward, each cell having exactly 6 adjacent cells, rendering using geometric properties of regular hexagons, and using canvas to draw the hexagonal grid. It even drew a diagram:

```
              /-q-\
           __/     \__
          /  \     /  \
    ____/     \___/    \____
   /    \     /   \    /    \
  /      \___/     \__/      \
  \      /   \     /  \      /
   \____/     \___/    \____/
   /    \     /   \    /    \
  /      \___/     \__/      \
  \      /   \     /  \      /
   \____/     \___/    \____/
        \     /   \    /
         \___/     \__/
```

This method would render a large hexagonal map, with the size determined by the center point's distance to four directions. Looking at Claude's implementation code, it was a bit complex and hard to understand quickly.

### Simplifying the Problem: Rectangular Honeycomb Map

Later, thinking carefully about this problem, we didn't need to generate a large hexagon. **We could generate a rectangular map, specifying rows and columns, with each row and column having the same number of cells, which would be simpler**.

After a simple prompt, **Claude3.5 understood my idea and regenerated the code**. This time it removed the previous axial coordinate system, using a simple rectangular array to store cells, determining adjacent cell positions based on row parity (since even and odd rows of hexagons are offset), with each row having the same number of cells, forming a rectangular area. It importantly rewrote the getHexCellFromPoint method for more accurate click detection.

Though the approach was clearer, Claude's implementation of getHexCellFromPoint was still incorrect, calculating wrong cell positions. Each calculation was offset, and after several prompts, Claude's code modifications were still incorrect.

To solve this problem thoroughly, **I decided to add complete test code, which would help me understand and also help Claude locate issues**.

## Adding Tests for More Accurate Fixes with Claude3.5

Here we didn't need to write the test cases ourselves, just prompt Claude3.5:

```
Please write a test case here that can use getHexCellFromPoint to reverse calculate row,col coordinates from pixel positions calculated by calculateCellCenter
```

So it implemented some basic test suites, verifying the accuracy of converting from cell coordinates to pixels and back to cell coordinates, testing cells at different positions and edge cells. **When adding test cases, I also added some logs for easier debugging**. After running the tests, it was easy to find exactly where things went wrong, and I gave the errors directly to Claude3.5:

```
There's an issue with coordinate conversion here, output:
   Test coordinates (0, 0): Pixel coordinates (40, 40)

      at log (src/app/[lang]/games/minesweeper/__tests__/HexRenderer.test.js:37:15)
          at Array.forEach (<anonymous>)

  console.log
    Test coordinates (0, 0): Pixel coordinates (40, 40) Reverse calculation result (-1, 0)
```

Subsequently, Claude3.5 modified the implementation, and the test cases passed successfully.

However, to be thorough, I further improved the test cases, iterating through each cell in a specified size honeycomb map, taking points at different positions within cells, calculating canvas coordinates, then reverse calculating cell coordinates from the canvas coordinates, verifying that the reverse-calculated coordinates matched the original coordinates. The test part is shown in the image:

![Code for Testing Coordinate Conversion](https://slefboot-1251736664.file.myqcloud.com/20241217_ai_gallery_minesweeper2_test.png)

After solving the cell positioning issue, clicking and revealing cells worked normally. Later, I had Claude generate more test cases for the core logic of hexagonal Minesweeper, giving us more confidence in future modifications.

By the way, I should mention that **Claude3.5 sometimes generates rather superficial test cases, so we still need to think about how to design effective test cases ourselves**. Fortunately, once you have a clear approach and provide clear prompts, Claude3.5 can generally generate the code without needing to write it yourself.

## Tips for Using Claude3.5

Building on the complete square grid Minesweeper, I finally implemented a hexagonal version with Claude3.5 and Cursor.

Overall, I found that Claude3.5 is quite dependent on specific prompts. As long as you think through the implementation approach clearly and reasonably break down the problem, providing step-by-step prompts, Claude3.5's generated code mostly meets expectations.

For complex problems, if you haven't thought them through yourself, you can first ask Claude3.5 to describe the general approach, rather than rushing to write code, otherwise you might get led astray by incorrect code and waste a lot of time.

Finally, one more tip: **if a function's implementation consistently doesn't meet expectations, you can add detailed test cases and think through specific cases and results, which helps quickly identify the problem**.
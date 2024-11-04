---
title: Building a Creative Snake Game with Power-ups Using Claude3.5
date: '2024-11-04 22:00:00'
tags: ['claude']
keywords: ['Claude3.5 Frontend Assistant', 'Creative Snake Game', 'Online Snake Game']
description: Using Claude3.5 to implement a fun snake game with a power-up system that supports various interesting creative items. This article will document the entire process of completing this creative snake game using Cursor, and we'll see how I better utilize AI to solve complex problems.
---

The previous snake game implementation was a bit too simple, with just basic movement and failure detection, which wasn't fun enough. So I thought about adding a power-up system to make the game more entertaining.

![Snake Game Power-up System](https://slefboot-1251736664.file.myqcloud.com/20241104_ai_gallery_snake_blog.png)

Play Here: [Online Creative Snake Game](https://gallery.selfboot.cn/en/games/snake)

If you have better gameplay ideas, welcome to leave a comment in the comment section.

## Snake Game Power-up System

My snake game had an initial version before, with very simple initial requirements. I wanted to continue optimizing based on this foundation. Simplify the food system to keep only apples and add a power-up system. The prompt was:

> Continue improving my snake game:
> 
> 1. Keep only one fruit (apple) and remove other fruits.
> 2. Design a power-up item system that supports adding different power-ups and functionalities.
> 3. Support obstacle-passing power-ups, randomly dropping 1 every 5s, appearing on screen for 3 seconds (these times should be easily adjustable). When eating this power-up, each one allows passing through obstacles once without ending the game.

Claude then modified some code to complete the following features:

1. Added power-up system related constant configurations
2. Added power-up state management and generation logic
3. Modified collision detection logic to support wall-passing power-ups
4. Added power-up display and counter
5. Generates one power-up every 5 seconds, disappearing after 3 seconds
6. Increases wall-passing count after eating power-ups, automatically consuming one wall-pass ability when hitting walls

It also told me that I could adjust the values in POWER_UP_CONFIG to change power-up generation interval and display time.

Based on my understanding of Claude3.5, **despite its good response with so many modification points, it's likely to introduce bugs**. After all, Claude3.5 still doesn't handle complex tasks very well currently.

After a quick look at the code, first, the legacy food-related code wasn't cleaned up completely. This is also a common issue I've encountered while using Cursor - **Claude often forgets to delete deprecated functional logic when making modifications**.

## Debugging with Logs

Additionally, the power-up generation part wasn't quite right, as the generation interval wasn't working. Looking at the code and logs, there seemed to be an issue with the generatePowerUp function implementation, preventing power-ups from generating.

Initially, Claude3.5's solution was to use a loop for random generation and check if the generated position had obstacles. However, this method wasn't good, so I directly suggested a better approach. The prompt was:

> We should record all empty grid positions, then freely choose from these empty positions when generating

**For algorithm-related logic, Claude3.5's generated code still needs human review, otherwise it might have verbose implementations**. After providing specific implementation ideas, Claude3.5 quickly provided the correct code and summarized the advantages of this implementation:

1. No need to use do-while loops to repeatedly attempt position generation
2. Ensures power-ups will definitely generate in valid empty positions
3. Avoids the possibility of infinite loops
4. More efficient because we collect all available positions before random selection

While debugging the above issues, there was still a problem. The logs added in the useEffect handling part kept printing:

```js
console.log("isPlaying now", isPlaying);
```

This useEffect is used to set up power-up generation timers and should only output when isPlaying or generatePowerUp changes. When I asked Claude3.5 about this, it immediately located the problem.

> This is because the dependencies of generatePowerUp cause the function to be recreated on every render, triggering useEffect.
> 
> ...// code implementation omitted
> 
> Here we reduced generatePowerUp's dependencies to only gridWidth and gridHeight, as these values won't change during gameplay
> 
> Other states (snake, food, obstacles, powerUp) will automatically get the latest values when the function executes, no need to be dependencies

## Updating UI Parts

Actually, **UI parts are Claude3.5's strength** - describe clearly what you want, and it can generally provide good code quickly. Here I wanted to add power-up settings in the settings section, supporting multiple power-up selection, with the wall-passing power-up enabled by default, and support for more power-ups later.

Claude3.5's modifications were good, mainly in these aspects:

1. Defined power-up type configuration structure for easy addition of new power-ups
2. Added power-up enable state management
3. Added power-up selection area in settings panel
4. Modified power-up generation logic to only generate enabled power-ups
5. Enabled wall-passing power-up by default
6. Supports enabling/disabling different power-ups via checkboxes

Finally, it thoughtfully reminded me to add new translations in the language file:

```json
power_ups: "Power-up Settings"
ghost_power: "Wall-passing Ability"
```

## Adding New Power-ups

Next, I wanted to add another power-up, food rain (basically a food explosion), appearing every 10s and disappearing after 5 seconds. When this power-up appears, it randomly generates lots of apples that last for 5 seconds.

Claude3.5 quickly provided these modifications:

1. Added food rain power-up type
2. Added food rain configuration (food quantity and duration)
3. Added food rain generation function
4. Modified power-up handling logic to support food rain
5. Enabled food rain power-up by default

This way, when the snake eats a food rain power-up, it immediately generates 10 food items that last for 5 seconds, after which it returns to the normal single food state.

This might have been a bit too complex for Claude3.5, as the generated code wasn't correct. After eating the food rain power-up, it wasn't generating multiple fruits, still just one.

After prompting, Claude quickly found the problem and provided a solution. The issue was in the generateFoodRain function, **we were overwriting previous food every time we generated new food. Let's modify the code to maintain a food array**.

- Add foodRain state to store multiple food items
- Modify generateFoodRain function to generate multiple food items at once and store in foodRain
- Add food rain detection in moveSnake function
- Add food rain display in rendering part

After these modifications, when the snake eats a food rain power-up, multiple food items appear on the map simultaneously, and the snake can eat these foods to increase score.

Actually, this modification wasn't good because it created a separate food array. A better approach would be to modify the existing single food basis rather than adding a separate food rain. **So when using Claude3.5, we still need to control code quality, at least know how to better modify certain requirements, and be able to point out when Claude provides suboptimal solutions**.

After a simple prompt here, Claude3.5 quickly provided the correct solution. Main modifications:

- Changed single food state to food array
- Modified food generation logic to support multiple food generation
- Modified collision detection logic to check for any food eaten
- Modified rendering logic to render all food
- Kept other game logic unchanged

After these modifications, the game normally has one food item, generates multiple food items after eating food rain power-up, returns to single food after 5 seconds
During food rain, eating food doesn't immediately generate new food.

Actually, it didn't get it right the first time, after running, both the snake and food disappeared. **I suspected there were many places involving food in the code, and Claude3.5 missed some parts**. So I asked it to **check all food-related places to support arrays**.

Looks like my understanding of Claude3.5's oversights was accurate, it got it right after the above prompt. Look at my snake during the food abundance state:

![Snake with Invincibility](https://slefboot-1251736664.file.myqcloud.com/20241104_ai_gallery_snake_apples.png)

## Snake Invincibility

Then added another power-up, invincibility, which adds a gold border to the snake's body after eating it, and removes obstacles when encountering them. The power-up effect lasts for 5 seconds. Initially prompted this way, the obstacle removal functionality was quickly implemented. But the snake's gold border implementation was poor.

Claude3.5 even refactored the snake's drawing part but still couldn't implement it well.

So I slightly modified the approach, prompting like this:

> During the GOLDEN power-up duration, the snake's entire body turns golden yellow.
> 
> Modify this part, check current golden state, and set blue or gold

If adding a gold border was difficult, at least changing the snake's color should work. Then I found the snake's current color part and gave the code directly to it. This way it provided perfect code in one go, now look at our invincible snake.

![Snake with Invincibility](https://slefboot-1251736664.file.myqcloud.com/20241104_ai_gallery_snake_golden.png)

Of course, while Claude3.5 quickly and roughly implemented this creative snake game, it still has some shortcomings. For example, currently I can only play a few rounds to check for bugs. Later I can have Claude3.5 help me write complete test cases to verify if there are any issues with this implementation.

Additionally, the code generated by Claude3.5 isn't elegant enough and might have some repetitive verbose parts, still having a gap compared to carefully written human code.
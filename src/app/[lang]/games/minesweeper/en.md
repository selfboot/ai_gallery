## History of Minesweeper

Minesweeper, also known as Mine Clearing in some regions, first appeared in the 1960s, but it became widely known when Microsoft included it as a default game in Windows 3.1 in 1992. Microsoft's initial purpose in developing this game was to train users to click accurately and quickly with the mouse.

This seemingly simple game is actually NP-complete in mathematical terms. It involves deep mental training in logical reasoning and probability judgment, making it a globally popular puzzle game suitable for people of all ages.

## Rules of Minesweeper

The goal of Minesweeper is simple - **find all safe squares while avoiding any mines**.

When the game starts, you'll see a rectangular grid of squares. Hidden beneath these squares are randomly distributed mines, with each square either being safe or containing one mine.

When you reveal a safe square, it displays a number. This number tells you important information: **how many mines are hidden in the 8 adjacent squares around it (boundary squares may have fewer than 8 neighbors)**. For example, if you see the number "3", it means that among the 8 surrounding squares, 3 contain mines. To enhance gameplay, your first click is guaranteed to be safe.

Using the information provided by these numbers, you can use logical reasoning to gradually identify safe squares and mine locations. If you accidentally click on a mine, the game ends. But if you successfully reveal all safe squares, you win!

## Game Interface Guide

At the top of the Minesweeper window on this page, you'll see a status bar containing three important information displays.

**The left side of the status bar features an LED-style digital display showing the current number of remaining mines**. This number equals the total mines minus the mines you've flagged. For example, in beginner mode, if you've flagged 3 mines, the display will show "007" (10-3=7).

**In the center of the status bar is a smiley face button**. Not only can this button restart the game, but it also changes expression based on game status: showing concern when clicking squares during gameplay, wearing sunglasses upon victory, and looking sad upon defeat.

**The right side of the status bar features another LED-style display as a timer**, starting from your first click and counting seconds. The timer maxes out at 999 seconds, a design that both satisfies most players' timing needs and provides a challenge for speed runners.

This Minesweeper game offers four difficulty levels, suitable for players of different skill levels:

- Easy mode is perfect for beginners. The game area is 9×9 squares with 10 mines. At this difficulty, the mine density is relatively low, giving players plenty of room for thinking and practice.
- Medium mode expands the game area to 16×16 with 40 mines. This difficulty requires players to have some reasoning ability and patience, making it ideal for improving Minesweeper skills.
- Expert mode uses an extra-wide 16×30 game area with 99 mines. This difficulty demands high levels of logical reasoning and attention from players, making it a challenge for experienced players.
- Additionally, the game offers a custom difficulty option. You can freely set the number of rows, columns, and mines to create your personalized gaming experience.

## Basic Operations

This Minesweeper implementation provides three basic operations:

1. **Left-clicking is the most basic operation**. When you left-click an unrevealed square, it gets revealed. If it's safe, it shows a number or blank; if it's a mine, the game ends. **When you click a blank square (with no mines in its 8 surrounding squares), the game automatically reveals the surrounding safe area**.
2. **Right-clicking is used to flag mines**. When you deduce that a square contains a mine, you can right-click to place a flag on it. Right-clicking again removes the flag. While flagging doesn't directly affect gameplay, it helps you track identified mine locations and prevent accidental clicks. The number of flags affects the remaining mine count displayed in the top left.
3. Double-clicking is an advanced operation that can greatly improve gameplay efficiency. When you double-click on a revealed number, if the number of flagged mines around it equals that number, the game automatically reveals all unflagged surrounding squares. This operation lets you reveal multiple squares you're confident are safe at once. However, **if your flagging was incorrect, you might trigger multiple mines at once**, so use this feature carefully.
# 2048 Game Guide

2048 is a classic number-combining puzzle. Use the arrow keys to slide all tiles on the board in one direction.  
When two tiles with the same value collide, they merge into a tile with double the value.

## Rules

- The board is 4x4.
- Every valid move spawns a new tile (`2` most of the time, occasionally `4`).
- You win when a tile reaches `2048`.
- You lose when no empty cells remain and no adjacent equal tiles can merge.

## Controls

- `↑` `↓` `←` `→`: Move tiles
- `Undo`: Revert one completed move
- `Reset`: Start a new random game
- `One Step Win / One Step Fail`: Load preset boards for quick testing

## Tips

- Keep your largest tile in a corner.
- Build rows in descending order and avoid breaking the structure.
- Use Undo to recover from risky moves while learning better patterns.

## Online Free Gomoku

Gomoku, also known as Five in a Row, is a two-player strategy board game. Players typically use black and white pieces, taking turns placing them on the intersections of horizontal and vertical lines on the board. The first player to form an unbroken line of five pieces horizontally, vertically, or diagonally wins the game.

Since 1899, when Japanese chess player Kuroi Iwa Ruiko proved that the original rules of Gomoku guaranteed a win for the first player, Gomoku has undergone continuous improvement. After decades of modifications, verifications, and further revisions, a version with added forbidden moves was developed. This version was publicly named Renju, thus the rules were formalized in Japan and are also known as Japanese rules or Renju rules. The original rules are still played by some and are referred to as "no-ban rules" or "free-style rules".

Here are some Gomoku terms:
- Five in a Row: Five consecutive pieces of the same color in a horizontal, vertical, or diagonal line.
- Open Four: A row of four pieces with both ends open, allowing for two ways to form Five in a Row.
- Closed Four: A row of four pieces with only one end open, allowing for one way to form Five in a Row.
- Open Three: A formation that can become an Open Four, including both continuous and jump open threes. A jump open three has one piece separated but still within five spaces, like `*0*00_`.
- Overline: A line of more than five consecutive pieces of the same color.
- Forbidden Moves: Black is prohibited from playing moves that create double threes, double fours, or overlines; doing so results in a loss.

## Forbidden Moves
The rules for forbidden moves are complex, but mainly include:
1. Double-Three: A move that simultaneously creates two or more open threes.
2. Overline: A move that forms a line of six or more consecutive pieces.
3. Double-Four: A move that simultaneously creates two or more fours (open or closed).

Under these rules, unless one side makes a low-level mistake by not blocking a closed four or open three, Black can only win through a "four-three" combination. White can win through "four-three," "three-three," "four-four," or by forcing Black to make a forbidden move. An overline also counts as a win for White.

## Features of This Online Page

This Gomoku code is open-source, completed with the help of Claude3.5, and has detailed test cases.

1. Added effects: A semi-transparent piece appears at the corresponding position on the board when the mouse hovers over it.
2. Added an undo function: Both Black and White can undo up to 3 moves each. Each undo is limited to one move at a time.
3. Optional forbidden move rules: If the first player makes a forbidden move and loses, all pieces contributing to the forbidden move will be highlighted.
## Online 3D Rubik's Cube

The Rubik's Cube is a mechanical puzzle toy invented in 1974 by Hungarian professor of architecture and sculptor Ernő Rubik. This page initializes with a standard 3*3 Rubik's Cube (also known as a 3rd-order cube).

The 3D cube on this page uses the official color scheme: white, red, orange, yellow, green, and blue, where white is opposite to yellow, red is opposite to orange, and blue is opposite to green.

The current page is implemented using three.js, supporting rotation to observe the cube from different angles and manipulation of each face.

- You can **left-click and drag in the gray background area** containing the cube to rotate the entire cube, or use three-finger drag on a Mac trackpad to change the cube's perspective.
- **When hovering over the cube, hold down the left mouse button to drag**. Click on any square on the cube's surface, then drag left-right or up-down to rotate the face containing that square.

### Basic Rules of the Rubik's Cube

A standard 3x3 Rubik's Cube consists of 6 faces, with 9 small squares on each face, totaling 26 small cubes. Each face has a different color (typically white, yellow, red, orange, blue, and green). The goal is to restore a scrambled cube to a state where each face displays a single color.

According to the World Cube Association (WCA) rules, there are several main ways to play:

- Speed Solving: The most basic and common way to play, aiming to solve the cube in the shortest time possible. Beginners typically use the Layer by Layer (LBL) method, while experts often use the CFOP method.
- Blindfolded Solving: Solving the cube without looking at it. Competitors must memorize the cube's state and then solve it while blindfolded.
- One-Handed Solving: Completing the cube using only one hand.
- Fewest Moves: Solving the cube with the minimum number of moves within a time limit (usually 60 minutes).

For beginners, the Layer by Layer (LBL) method is most recommended, with the following steps:

1. Solve the first layer (usually the bottom layer)
2. Solve the middle layer
3. Solve the top layer

As skills improve, one can learn more advanced solving methods like CFOP. Currently, the world record holder for speed solving is Max Park, who set the single solve record at 3.134 seconds.

### Built-in Auto Solve Methods

This page includes automatic solving to help you learn solution sequences and quickly validate the current cube state.

- `Kociemba`: Uses the classic two-phase solving approach. It usually produces shorter solutions and is good for studying efficient move sequences.
- `Reverse`: Solves by reversing the scramble operations. It is more intuitive for beginners because it follows the idea of "undo what was done."

Recommended workflow:

1. Click `Scramble` to generate a random state
2. Select `Kociemba` or `Reverse` in the solver method dropdown
3. Click `Generate Solution` to get the full move list
4. Use `Next Step` if you want to execute and learn step by step
5. Use `Auto Solve` if you want to complete the solve directly
6. Click `Stop Auto Solve` at any time during autoplay

Notes:

- Solution steps are shown below the cube area, with progress highlighting.
- If the cube is already solved, the page will show an "already solved" prompt.

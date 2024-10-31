
## Introduction to Sliding Puzzle Game

The Sliding Puzzle is a classic puzzle game where players need to rearrange scrambled numbers into the correct order by moving tiles. **The goal is to arrange the numbers in ascending order with the empty space at the end**.

Rules:

1. The game board consists of n×n grid cells (this game supports 3×3, 4×4, 5×5);
2. Each cell contains numbers from 1 to n²-1, plus one empty space;
3. Numbers can only be rearranged by moving them into the adjacent empty space;
4. The game is won when all numbers are arranged in sequence (1 to n²-1) with the empty space at the end;

## Features of This Page

1. **Support for Different Difficulty Levels:**
   - Easy: 1-5 random moves
   - Medium: 5-50 random moves
   - Hard: 50-500 random moves

2. **Excellent User Experience:**
   - Click adjacent numbers to swap with empty space, responsive layout for different screens;
   - Animated movements to easily observe each step
   - Track moves count and time

3. **Special Features:**
   - Manual setup of initial layout, convenient for solving any configuration
   - Smart solving feature (A* algorithm)
   - Step-by-step solution display
   - Validation of solvability during manual setup

## Playing Tips

Finding **a solution for the sliding puzzle is relatively easy, but finding the optimal solution is an NP-hard problem**.

There are some techniques, such as identifying optimal paths by observing the shortest route from target numbers to their destinations, planning empty space movements in advance, and avoiding ineffective back-and-forth moves. Additionally, try to think multiple steps ahead rather than just one move at a time, plan 2-3 moves ahead, and be careful not to obstruct subsequent operations.

It's important to note that not all manually set number layouts are solvable. For a configuration to be solvable, it must meet these conditions:

- Odd-sized boards (3×3, 5×5): The number of inversions must be even
- Even-sized boards (4×4): The sum of inversions and empty space row number (counting from bottom) must be odd

## Smart Solving Algorithm

All randomly generated initial layouts on this page are solvable. The page uses the A* algorithm for smart solving, with these steps:

1. Uses Manhattan distance as the heuristic function;
2. Stores states to explore in a priority queue;
3. Records visited states to avoid repeated searches;
4. Shows solution steps after finding the shortest path;

For larger sizes (4×4, 5×5) at higher difficulties, more steps may be needed, and **smart calculation might get stuck**. It's recommended to start with lower difficulties.

This game is open source, with code available on Github.
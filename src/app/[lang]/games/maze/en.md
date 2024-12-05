A maze is an ancient and fascinating puzzle game with a history dating back thousands of years. The earliest mazes likely originated in ancient Egypt and Greece, used for religious ceremonies and architectural design. Today, mazes have evolved into a popular form of puzzle gaming.

The essence of a maze is to **create a challenge within a limited space where players must find their way from entrance to exit through complex pathways**. The online maze on this page offers various maze shapes and generation algorithms, allowing players to experience different styles of maze solving.

## How to Play the Online Maze Game

### Getting Started

Before starting your maze exploration, you can adjust various maze settings according to your preferences (we'll explain these settings later), then click the "**Generate Maze**" button to create a new maze. Once the maze is generated, click "**Start Game**" to enter game mode.

In the maze interface, a green dot represents the entrance, while **the exit** is marked with a prominent red dot. You can find the exit using either keyboard controls or mouse movement. The system will **automatically mark the paths you've traveled**, helping you avoid exploring the same routes repeatedly.

When you successfully reach the end, the system will display your game statistics, including completion time and path efficiency, allowing you to evaluate your performance and try to break records.

### Movement Methods
There are two simple ways to move in the maze: **using keyboard or mouse**. If you prefer keyboard controls, you can use the arrow keys for up, down, left, and right movement. For special maze shapes, you can also use A, S, Z, and X keys for diagonal movement, making it easier to reach certain positions.

Circular mazes have special movement controls - you can use Q and W keys to rotate clockwise or counterclockwise, and P, L, and semicolon keys to switch between inner and outer rings. These key mappings make movement in circular mazes more flexible and intuitive.

If you find keyboard controls cumbersome, you can simply use the mouse. Just move your cursor in the direction you want to go, and your character will automatically move in that direction.

### Helper Functions
The game provides several useful helper functions.

If you find yourself completely lost, you can click "**Show Path**" to **highlight the shortest path from entrance to exit in a distinctive color**.

If you're interested in the maze structure, you can click "**Show Distance Map**" to display the shortest distance from the start to each position using different colors, helping you better understand the maze layout.

If you find a particular maze interesting, you can use the "**Download Maze**" feature to save it as an SVG image for later viewing or sharing. The downloaded image shows the maze as currently rendered, which may include the shortest path, distance map, or your traveled path.

If you successfully reach the end, the page will display your performance metrics, including several important data points:

1. Completion time from your first move to reaching the exit;
2. Number of cells visited during exploration;
3. Optimal path length (shortest distance from entrance to exit);
4. Your path efficiency (ratio of actual path taken to shortest path);
5. And your movement speed (average cells traversed per second).
   
Through these metrics, you can understand your puzzle-solving performance and continuously improve your maze exploration skills.

## Advanced Maze Generation Settings

### Maze Shapes
This page supports multiple maze shapes for generation. First is the square maze, a classic maze form composed of traditional grid cells, suitable for beginners and those who enjoy classic styles. Next is the triangular maze, constructed from triangular units, offering more intricate pathways and suitable for players seeking higher difficulty.

If you want to try different visual effects, you can choose the hexagonal maze, inspired by honeycomb structures, offering more diverse path connections and a fresh puzzle-solving experience. Finally, there's the circular maze, formed by concentric circles, whose unique layout requires different movement strategies during exploration.

![Maze generator: various maze shapes](https://slefboot-1251736664.file.myqcloud.com/20241205_ai_gallery_maze_alltype.png)

### Exit Configuration

In the maze game, exit configuration can significantly impact game difficulty and experience. First is the "Hardest Path" option, which **automatically selects the two farthest points in the maze as entrance and exit, providing the maximum challenge for players who enjoy extreme challenges**.

If you prefer traditional maze layouts, you can choose the "Horizontal Exit" configuration, which places the entrance and exit on the left and right sides of the maze, offering relatively straightforward paths. There's also the "Vertical Exit" configuration, placing the entrance and exit at the top and bottom of the maze, providing a different puzzle-solving experience.

### Maze Size, Random Seeds, and Other Settings
The game offers several practical customization options. For square, triangular, and hexagonal mazes, you can adjust width and height to control maze size. Want a more challenging maze? Try increasing the width and height. Want quick practice? Set smaller dimensions.

**Circular mazes are special - you need to set the number of layers, which determines the number of concentric circles**. More layers mean a more complex maze and larger exploration space.

If you find a maze you particularly like, **you can note down its seed value**. Each maze has a unique seed value, and entering the same seed will regenerate exactly the same maze. This feature is perfect for competing with friends or re-challenging your favorite maze layouts. However, remember that seeds work in conjunction with maze shape, exit configuration, and generation algorithm - only identical configurations with the same seed will generate identical mazes.

### Maze Generation Algorithms

The game offers multiple maze generation algorithms, each producing different styles of mazes:

| Algorithm | Speed | Complexity | Memory Usage | Path Characteristics | Advantages | Disadvantages |
|-----------|-------|------------|--------------|---------------------|------------|---------------|
| Binary Tree | O(n) | Low | Low | Always biased towards SE | Simple implementation<br>Very fast<br>Low memory usage | Clear directional bias<br>Lacks randomness<br>Lower difficulty |
| Sidewinder | O(n) | Low | Low | Row-based, horizontal bias | Fast<br>Relatively simple<br>More random than Binary Tree | Directional bias<br>Square mazes only<br>Predictable patterns |
| Aldous-Broder | O(n³) | High | Low | Completely random, unbiased | Truly random mazes<br>Even distribution<br>Works for all shapes | Extremely slow<br>Impractical for large mazes<br>Unpredictable timing |
| Wilson's | O(n²) | Medium | Low | Unbiased, uniform distribution | Unbiased generation<br>High path quality<br>Statistically uniform | Slow<br>Not for real-time<br>Complex implementation |
| Hunt and Kill | O(n²) | Medium | Low | Tends to create long paths | Efficient memory use<br>Balanced mazes<br>Works for all shapes | Medium speed<br>Slight path bias<br>Visible scan patterns |
| Recursive Backtracker | O(n) | Medium | High | Long paths, few dead ends | Fast<br>Interesting mazes<br>High path complexity | High memory usage<br>Requires stack<br>Possible stack overflow |
| Kruskal's | O(n log n) | Medium | Medium | Even distribution, shorter paths | Balanced mazes<br>Parallel-friendly<br>Predictable results | Extra data structures<br>Complex implementation<br>Square mazes only |
| Simplified Prim's | O(n) | Low | Low | Tree-like branching | Fast<br>Simple implementation<br>Low memory usage | Less randomness<br>Straight passages<br>Obvious branching |
| True Prim's | O(n log n) | Medium | Medium | Balanced tree structure | High quality<br>Good distribution<br>Works for all shapes | Slower speed<br>Complex implementation<br>Requires priority queue |
| Eller's | O(n) | High | Low | Row-based, memory efficient | Very fast<br>Minimal memory<br>Infinite maze capable | Most complex<br>Square mazes only<br>Hard to debug |

For players interested in the maze generation process, you can check the "**Show Generation Process**" option. This allows you to watch how the maze is built step by step, which is both interesting and helps understand the principles behind maze generation.
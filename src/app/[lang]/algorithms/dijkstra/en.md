Dijkstra's algorithm is a classic algorithm for solving the **single-source shortest path problem in weighted graphs**. It was proposed by Dutch computer scientist Edsger Dijkstra in 1956. In real life, this algorithm is widely used in navigation systems, network routing, and other scenarios.

For example, in map navigation, cities can be viewed as nodes in the graph, roads as edges, and distance or time as weights. Dijkstra's algorithm helps us **find the shortest paths from a starting city to all other cities**.

## Dijkstra's Algorithm Principle

The core idea of Dijkstra's algorithm is to **gradually extend the shortest paths to find the shortest distances from the starting point to all other nodes**. It employs a **greedy strategy**, always selecting the unvisited node with the smallest distance for expansion.

The algorithm maintains two key data structures: **a distance array 'dis' that records the shortest distances, and a vertex set 'T' that records nodes with confirmed shortest paths**. Initially, the distance from the starting point to itself is set to 0, to all other vertices to infinity, and set T only contains the starting point.

In each iteration, the algorithm selects the vertex with the smallest distance from the unvisited vertices in the dis array and adds it to set T. The shortest path to this vertex is now confirmed. Then, the algorithm uses this newly added vertex as a transit point to check and update the path lengths from the starting point through this vertex to other vertices. If **a shorter path can be found through this transit point, the distance value for the corresponding vertex in the dis array is updated**.

This process continues until one of the following conditions is met:

1. All vertices have been added to set T, indicating that the shortest paths to all reachable vertices have been confirmed;
2. All remaining unvisited vertices have infinite distance values, indicating these vertices are unreachable from the starting point.

When the algorithm terminates, the dis array contains the shortest distances from the starting point to all other vertices, where vertices with infinite distance are unreachable from the starting point. Additionally, by recording predecessor nodes along the paths, we can reconstruct the specific shortest paths to all reachable vertices.

Finding it hard to understand? No worries, let's use the visualization tool to understand this process.

## Visualization Operation Guide

This visualization tool is quite powerful, supporting the following features:

- You can **select the starting node** in the top-left corner. The default is node A, but you can choose different starting nodes to see how paths differ;
- Double-click on edges to modify their weights, you can **modify weights**, delete edges with the Del key after clicking them, or delete nodes with the Del key after clicking them. Observe how changing nodes, edges, and weights affects the shortest paths;
- During algorithm execution, the shortest paths are highlighted in green, and the weight matrix and each calculation step are displayed in real-time on the right;
- Supports step-by-step and automatic execution, with the ability to pause automatic execution using the pause button, making it easier to understand the algorithm's execution process.

Using this visualization tool, we can intuitively understand how Dijkstra's algorithm finds the shortest paths step by step. When edge weights are modified, the algorithm recalculates, helping us understand how different weights affect the shortest paths.

## Specific Shortest Path Finding Process

For the undirected graph below, let's choose A as the starting node and see how the algorithm finds the shortest paths step by step.

Click next step, in the first step with A as the starting point, it records the shortest distances to each point through A.

![Dijkstra Algorithm Step 1](https://slefboot-1251736664.file.myqcloud.com/20241122_ai_gallery_dijkstra_step1_en.png)

Continue clicking next step, and you'll see that from the unvisited vertices in the previous step, the vertex with the smallest distance is selected, which is vertex D with a distance of 4.

Using D as a transit point, update the distances from A through D to other vertices, as shown below:

![Dijkstra Algorithm Step 2](https://slefboot-1251736664.file.myqcloud.com/20241122_ai_gallery_dijkstra_step2_en.png)

You can see that the distances to both B and E have been updated. B's distance was updated from 10 to 6, and E's distance from infinity to 4.

You can continue to the next step, observing the search process here, watching how the distance numbers and searched vertices change. The final result is as follows:

![Dijkstra Algorithm Final Result](https://slefboot-1251736664.file.myqcloud.com/20241122_ai_gallery_dijkstra_step_final_en.png)

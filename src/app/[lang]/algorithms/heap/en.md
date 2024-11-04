A heap is a specialized tree-based data structure that follows specific rules for organizing data. It comes in two main types:

- Max Heap: Each node's value is greater than or equal to its child nodes, making the root node always the largest value in the heap
- Min Heap: Each node's value is less than or equal to its child nodes, making the root node always the smallest value in the heap

Key characteristics of heaps:

1. Structural Property: It is a complete binary tree, meaning all levels except possibly the last are completely filled, and nodes in the last level are filled from left to right. This ensures structural regularity.
2. Storage Efficiency: **Although a heap is a tree structure, it can be efficiently stored in an array**. For a node at index i: its parent node index is (i-1)/2, left child index is 2i + 1, and right child index is 2i + 2. This pointer-free storage method saves memory while improving access efficiency.

Main operations and their time complexities:

- Get maximum/minimum (root element): O(1);
- Insert new element: O(log n), requires heapify-up operation to maintain heap property;
- Delete root element: O(log n), requires heapify-down operation to rebuild heap;
- Build heap: O(n), although it appears to be O(nlog n), **optimization actually achieves O(n)**;
- Heap sort: O(nlog n), achieved by repeatedly extracting the root element;

These efficient operations make heaps particularly advantageous for handling priority-related problems, such as priority queues and task scheduling.

## Heap Visualization Guide

This page provides visual demonstrations of various heap operations. You can freely switch between max heap and min heap using the interface button, and the system will **automatically rebuild the entire heap structure** when switching.

Enter a number in the input box and click the "Insert Node" button to observe how a new node finds its correct position through the heapify-up operation.

When clicking the "Delete Root" button, you'll see the root element being removed and how the last node rebuilds heap balance through the heapify-down operation. The deleted node will briefly appear on the right before disappearing.

Additionally, the page offers a random initialization feature that quickly generates a new heap containing 10 to 50 random values, facilitating various tests and observations.

This page uses appropriate algorithms to **ensure aesthetically pleasing heap layouts and clear structure visualization**.

## Heap Applications

Heaps are widely used in practical programming. In **priority queue scenarios, heaps efficiently manage tasks with priorities**. For example, operating system process schedulers use heaps to select the next process to execute, and task scheduling systems use them to arrange work priorities. Network routing algorithms also frequently use heaps to maintain network packet processing order.

In sorting, **heap sort algorithm leverages heap properties to complete sorting in O(nlog n) time**. By repeatedly extracting the root element and rebuilding the heap, we obtain a sorted sequence. This sorting method's main advantage is its low space complexity, requiring only constant extra space.

For data stream processing, **heaps are particularly suitable for dynamically maintaining extremal values**. For instance, when finding the k largest or smallest elements in a continuous data stream, we can maintain a heap of size k. **When calculating the median of a data stream, we can use two heaps (one max heap and one min heap) to dynamically track median changes**.

In graph algorithms, heaps play crucial roles. Dijkstra's shortest path algorithm uses a min heap to select the next vertex to process, ensuring it always processes the current shortest path. Similarly, in Prim's minimum spanning tree algorithm, heaps efficiently select edges with minimum weight to help construct the minimum spanning tree.
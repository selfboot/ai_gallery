## Tower of Hanoi Game

The Tower of Hanoi is a famous mathematical game or puzzle, said to originate from an ancient Indian legend. According to the legend, there was a temple with three pegs, and 64 golden disks of different sizes were stacked on the first peg. The monks' task was to move all the disks from the first peg to the third peg, following these rules:

1. **Only one disk can be moved at a time**
2. **A larger disk cannot be placed on top of a smaller disk**

The legend says that when the monks complete this task, the world will end. This puzzle was later popularized by the French mathematician Édouard Lucas.

## Play Tower of Hanoi Online

This page simulates the Tower of Hanoi game. You can **choose the number of disks and then click to start the game**. In manual mode, you can move disks by dragging and dropping, and the system will check if the move is legal. In automatic mode, a recursive algorithm will find the optimal solution, display the total number of steps needed, and start moving the disks automatically. You can choose the movement speed in automatic mode to observe the entire process.

This page also provides a **hint feature**. Whenever you're unsure about the next move, you can click to get a hint. The core of the hint feature is to determine the best next move by comparing the current state with the ideal state. Even if your current disk placement is incorrect, the hint will tell you the optimal move.

Starting the automatic movement from the beginning is relatively simple; it's just a recursive problem. If the operator follows these recursive steps in manual mode, getting hints is also straightforward. But what if the operator doesn't follow the pattern and **takes some redundant steps? How do we provide the optimal next step hint in this case**? You can check the explanation on Wikipedia, haha, isn't it hard to understand? Now look at the implementation code on this page, isn't it simple!


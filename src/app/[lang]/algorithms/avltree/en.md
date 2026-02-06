An AVL tree (Adelson-Velsky and Landis Tree) is a **self-balancing binary search tree**. It keeps BST ordering while enforcing a balance constraint at every node: `BF = height(left) - height(right)`, with `BF ∈ [-1, 1]`.

This gives AVL trees strong practical behavior:

- Search, insert, and delete remain near `O(log n)`;
- The tree avoids rapid degeneration under sorted insertions;
- After each update, AVL rebalances by walking back up the path.

## Dynamic Rebalancing (Core Focus)

This page emphasizes AVL balancing mechanics, especially the four rotation cases:

### 1. LL Case (Single Right Rotation)
Triggered when a node is left-heavy and the heavier path is on the left child's left side.

### 2. RR Case (Single Left Rotation)
Triggered when a node is right-heavy and the heavier path is on the right child’s right side.

### 3. LR Case (Left Rotation + Right Rotation)
Triggered when a node is left-heavy but the heavier path is on the left child's right side.

### 4. RL Case (Right Rotation + Left Rotation)
Triggered when a node is right-heavy but the heavier path is on the right child's left side.

The visualizer shows step-by-step:

- Access path and imbalance detection;
- Key parent/child changes before and after rotation;
- Subtree reattachment and height/BF updates;
- Final balanced structure after each operation.

## Tips for Clear Observation

- Use sequential initialization or monotonic inserts to trigger rotations more often;
- Reduce animation speed for easier frame-by-frame inspection;
- Use “Replay Last Operation” to rewatch the exact balancing sequence.

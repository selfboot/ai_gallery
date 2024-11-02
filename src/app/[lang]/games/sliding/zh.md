
## 数字华容道游戏介绍

数字华容道是一种经典的益智游戏，玩家需要通过移动方块，将打乱的数字重新排列成正确的顺序。**游戏目标是将数字按照从小到大的顺序排列，空格位于最后**。

规则如下：

1. 游戏面板由 n×n 的方格组成（本游戏支持 3×3、4×4、5×5）；
2. 每个方格包含 1 到 n²-1 的数字，以及一个空格；
3. 只能通过将数字移动到相邻的空格位置来重新排列数字；
4. 当所有数字按顺序排列（1 到 n²-1），且空格在最后时，游戏获胜；

## 本页面功能特点

1. **支持选择不同难度进行初始化：**：
   - 简单：1-5 步随机打乱
   - 中等：5-50 步随机打乱
   - 困难：50-500 步随机打乱

2. **良好的操作体验：**
   - 点击相邻数字与空格交换位置，根据不同屏幕响应式布局；
   - 支持移动动画效果，可以方便观察每一步的变化
   - 记录移动步数和用时

3. **数字华容道特色功能：**
   - 手动设置初始布局，可以方便复原任何局面。
   - 智能求解功能（A*算法）
   - 逐步展示解决方案
   - 手动设置的时候，会验证布局是否可解

## 玩法技巧

寻找**数华容道的一个解相对容易，但寻找最优解是一个 NP 困难问题**。

有一些技巧，比如要识别最优路径，观察目标数字到目的地的最短路径，提前规划空格的移动路线，避免无效的来回移动。另外要尽量多步思考，不要只看一步移动，提前 2-3 步规划移动路线，注意移动过程中不要阻碍后续操作。

另外要说明的是，对于手动随机设置的一个数字布局，不一定有解的。要满足可解，必须满足下面条件。 

- 奇数阶（3×3、5×5）：逆序数必须为偶数
- 偶数阶（4×4）：逆序数加上空格所在行数（从底部数）必须为奇数

## 智能求解算法

本页面随机生成的都是有解的初始数字布局，页面使用 A* 算法进行智能求解，具体步骤：

1. 使用曼哈顿距离作为启发式函数；
2. 优先队列存储待探索状态；
3. 记录已访问状态避免重复搜索；
4. 找到最短路径后逐步展示解决方案；

对于较大尺寸（4×4、5×5）的困难难度可能需要较多步骤，**智能计算可能会卡住**，建议从低难度开始玩。

本游戏开源，代码在 Github 上。
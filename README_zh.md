
<a name="中文"></a>

我不会前端技术，不懂现代 web 开发，顶多只懂一点点 html 和 css，在 Claude3.5 和 GPT4 的助攻下，完成了一些有意思的小组件，我把它们集成在这个[展示站点](gallery.selfboot.cn)，欢迎来体验。

不得不说，AI 真的改变写代码的方式。

# 项目介绍

使用 React 和 Gatsby 进行静态站点生成（SSG），部署在 Netlify 上。功能上包括站点地图自动生成、Google Analytics 集成和 i18n 国际化支持。目前主要有下面一些有意思的小组件，我会用 AI 持续增加更多项目。

算法：探索经典算法的交互式可视化，如 BFS 寻路、A* 搜索、Dijkstra 算法和堆操作。

<div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
  <img src="https://slefboot-1251736664.file.myqcloud.com/20240706_ai_gallery_bfs_path.gif" alt="BFS 路径搜索" width="32%" height="200">
  <img src="https://slefboot-1251736664.file.myqcloud.com/20240709_ai_gallery_dijkstra_v3.gif" alt="Dijkstra 最短路径" width="32%" height="200">
  <img src="https://slefboot-1251736664.file.myqcloud.com/20240706_ai_gallery_heapv2.gif" alt="堆数据结构" width="32%" height="200">
</div>

游戏：实现了一些经典的游戏，如五子棋、中国象棋、俄罗斯方块和 2048。

<div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
  <img src="https://slefboot-1251736664.file.myqcloud.com/20240704_ai_gallery_gomoku.png/webp" alt="五子棋" width="32%" height="200">
  <img src="https://slefboot-1251736664.file.myqcloud.com/20240707_ai_gallery_tetris_v2.png/webp" alt="俄罗斯方块" width="32%" height="200">
  <img src="https://slefboot-1251736664.file.myqcloud.com/20240710_ai_gallery_game2048.gif" alt="2024" width="32%" height="200">
</div>

其他：一些有趣的小组件，如动态图表：体验动态条形图和其他数据可视化。

# 本地开发

欢迎大家一起来完善这里的小组件，**没有前端技术背景也没关系，可以借助 AI 来实现你的想法**。本地运行此项目的步骤很简单：

1. 克隆仓库：
   ```
   git clone git@github.com:selfboot/ai_gallery.git
   ```

2. 进入项目目录：
   ```
   cd ai_gallery
   ```

3. 安装依赖：
   ```
   yarn install
   ```

4. 启动开发服务器：
   ```
   yarn develop
   ```

5. 打开浏览器并访问 `http://localhost:8000` 就可以查看了。

当然中间遇到任何问题，尝试去用 AI 解决吧～

# 使用 AI 的感悟

作为一个没有 web 开发经验的菜鸟，通过 AI 辅助开发这个项目，学习了不少实用前端知识。同时完成了之前一直想做的可视化，很有成就感。

2. **学习机会**：通过 AI 辅助，快速了解一些 React、JavaScript 和现代 Web 开发实践。
3. **问题解决**：虽然 AI 在许多方面都发挥了重要作用，但还是有些问题，**需要人去解决**。

**AI 带来的改变**：GPT-4 和 Claude 3.5，是完全合格的虚拟导师和结对编程伙伴。即使我之前没有 React 开发经验，它们帮助我快速理解 React 概念，实现复杂逻辑，创建吸引人的 UI，同时解释底层原理，是优秀的编程助手。通过 AI 可以快速了解到最佳实践、设计模式和优化技术，帮助解决各种疑难问题，是当之无愧的最佳导师。
**AI 的局限性**：AI 还是有一定幻觉，推理能力也还不够。有时 AI 生成的代码存在 bug 或不能完全满足项目需求，有时候给出的解释也是不够清晰。在这种情况下，需要自己去调试，去解决问题。
**AI-人类协作**：最有效的方法是将 AI 作为协作工具，将其广博知识与个人的创造力和项目特定理解相结合，更快更好完成一些有趣的工作。

# 比较 GPT-4 和 Claude 3.5

个人观点，仅供参考。这两种 AI 模型在这个项目中都发挥了重要作用，各有优势。我通常用 Claude3.5 快速完成原型，用 GPT-4 辅助解决细节问题。

- **GPT-4**：擅长提供详细解释和处理复杂的多步骤任务。有些自己大概知道原因的问题，给出详细提示词后，GPT-4 会给出不错的代码和解释。
- **Claude 3.5**：在代码生成和重构方面表现出色。给出简单需求描述，往往很快就给出一个不错的原型。它的回答通常更简洁、更直接适用，非常适合快速实现和修复 bug。
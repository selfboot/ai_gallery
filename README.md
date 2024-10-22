[English](./README.md) | [中文](./README_zh.md)

<p align="center">
 <a href="https://codecov.io/gh/selfboot/ai_gallery" >
 <img src="https://codecov.io/gh/selfboot/ai_gallery/graph/badge.svg?token=1R6P7MK27D" alt="Test coverage"/>
 </a>
</p>

<a name="english"></a>

Welcome to my AI-assisted web development project! Despite having minimal frontend knowledge (just a bit of HTML and CSS), I've managed to create some interesting components with the help of Claude 3.5 and GPT-4. I've integrated these components into this [showcase site](https://gallery.selfboot.cn). Feel free to explore and experience it yourself!

I must say, AI has truly transformed the way we write code.

# Project Overview

This project is built using React and Nextjs for static site generation (SSG) and is deployed on Netlify. It features automatic sitemap generation, Google Analytics integration, and i18n support for internationalization. Currently, the gallery includes several interesting components, and I plan to continually add more with AI assistance.

Algorithms: Explore interactive visualizations of classic algorithms such as BFS pathfinding, A* search, Dijkstra's algorithm, and heap operations.

<div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
  <img src="https://slefboot-1251736664.file.myqcloud.com/20240706_ai_gallery_bfs_path.gif" alt="BFS Pathfinding" width="32%" height="200">
  <img src="https://slefboot-1251736664.file.myqcloud.com/20240709_ai_gallery_dijkstra_v3.gif" alt="Dijkstra's Shortest Path" width="32%" height="200">
  <img src="https://slefboot-1251736664.file.myqcloud.com/20240706_ai_gallery_heapv2.gif" alt="Heap Data Structure" width="32%" height="200">
</div>

Games: Implementation of classic games like Gomoku (Five in a Row), Chinese Chess, Tetris, and 2048.

<div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
  <img src="https://slefboot-1251736664.file.myqcloud.com/20241022_ai_gallery_gomoku.webp" alt="Gomoku" width="32%" height="200">
  <img src="https://slefboot-1251736664.file.myqcloud.com/20240707_ai_gallery_tetris_v2.png/webp" alt="Tetris" width="32%" height="200">
  <img src="https://slefboot-1251736664.file.myqcloud.com/20240710_ai_gallery_game2048.gif" alt="2048" width="32%" height="200">
</div>

Other Components: Various interesting widgets, including dynamic charts for data visualization.

# Local Development

Everyone is welcome to contribute to improving these components. **Don't worry if you lack a frontend technical background – you can leverage AI to bring your ideas to life!** Here are the simple steps to run this project locally:

1. Clone the repository:
   ```
   git clone git@github.com:selfboot/ai_gallery.git
   ```
2. Navigate to the project directory:
   ```
   cd ai_gallery
   ```
3. Install dependencies:
   ```
   pnpm install
   ```
4. Start the development server:
   ```
   pnpm dev
   ```
5. Open your browser and visit `http://localhost:3000` to view the project.

If you encounter any issues along the way, try using AI to solve them!

# Reflections on Using AI

As a novice with no web development experience, I've learned a lot of practical frontend knowledge through AI-assisted development of this project. It's been incredibly fulfilling to finally create the visualizations I've always wanted to make.

1. **Learning Opportunity**: AI assistance helped me quickly understand aspects of React, JavaScript, and modern web development practices.
2. **Problem Solving**: While AI played a crucial role in many aspects, there were still issues that **required human intervention** to resolve.

## The Impact of AI

GPT-4 and Claude 3.5 have proven to be fully capable virtual mentors and pair programming partners. Even without prior React development experience, they helped me quickly grasp React concepts, implement complex logic, create appealing UIs, and understand underlying principles. They are excellent programming assistants, rapidly introducing best practices, design patterns, and optimization techniques. They help solve various challenging problems, truly earning the title of best mentors.

## Limitations of AI

AI still has some hallucinations and limitations in reasoning ability. Sometimes AI-generated code contains bugs or doesn't fully meet project requirements, and sometimes the explanations provided aren't clear enough. In these situations, you need to debug and solve problems on your own.

## AI-Human Collaboration

The most effective approach is to use AI as a collaborative tool, combining its vast knowledge with personal creativity and project-specific understanding to complete interesting work faster and better.

## Comparing GPT-4 and Claude 3.5

These are personal opinions and for reference only. Both AI models played important roles in this project, each with its own strengths. I typically use Claude 3.5 for quick prototyping and GPT-4 for solving detailed issues.

- **GPT-4**: Excels at providing detailed explanations and handling complex, multi-step tasks. For issues where I have a general understanding of the cause, GPT-4 often provides good code and explanations when given detailed prompts.
- **Claude 3.5**: Performs exceptionally well in code generation and refactoring. Given a simple requirement description, it often quickly produces a good prototype. Its responses are usually more concise and directly applicable, making it great for rapid implementation and bug fixing.
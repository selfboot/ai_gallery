
const projects = {
  games: [
    {
      id: 1,
      title: '五子棋',
      description: '本游戏使用 React 框架开发，通过 claude3.5 自动构建项目基础结构。利用 React 的组件化特性，游戏界面和逻辑清晰分离，便于维护和扩展。',
      image: 'https://slefboot-1251736664.file.myqcloud.com/20240704_ai_gallery_gomoku.png/webp',
      link: '/games/gomoku'
    },
    {
      id: 2,
      title: '俄罗斯方块',
      description: '经典的俄罗斯方块游戏，使用现代 Web 技术重新实现。挑战你的空间感知能力和快速思考！',
      image: 'https://slefboot-1251736664.file.myqcloud.com/20240704_ai_gallery_tetris.png/webp',
      link: '/games/tetris'
    },
    // 可以继续添加更多游戏...
  ],
  algorithms: [
    {
      id: 'bfs_path',
      title: '广度优先寻路算法可视化',
      description: '可视化展示广度优先寻路算法的工作过程',
      image: 'https://slefboot-1251736664.file.myqcloud.com/20240705_ai_gallery_bfs_path.png',
      link: '/algorithms/bfs_path'
    },
    {
      id: 'heap',
      title: '堆操作算法可视化(开发中)',
      description: '可视化展示堆操作，包括插入、删除、堆化等操作。动态显示每次操作的具体步骤，帮助理解堆操作的原理。',
      image: 'https://slefboot-1251736664.file.myqcloud.com/20240705_ai_gallery_bfs_path.png',
      link: '/algorithms/heap'
    },
    // 这里可以添加算法相关的项目
  ],
  others: [
    // 这里可以添加其他类别的项目
  ]
};

export default projects;
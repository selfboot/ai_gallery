
const projects = {
  games: [
    {
      id: 1,
      title: '五子棋',
      description: '本游戏使用 React 框架开发，通过 claude3.5 自动构建项目基础结构。利用 React 的组件化特性，游戏界面和逻辑清晰分离，便于维护和扩展。',
      image: 'images/gomoku.png',
      link: '/games/gomoku'
    },
    {
      id: 2,
      title: '俄罗斯方块',
      description: '经典的俄罗斯方块游戏，使用现代 Web 技术重新实现。挑战你的空间感知能力和快速思考！',
      image: '/images/tetris.png',
      link: '/games/tetris'
    },
    // 可以继续添加更多游戏...
  ],
  algorithms: [
    // 这里可以添加算法相关的项目
  ],
  others: [
    // 这里可以添加其他类别的项目
  ]
};

export default projects;
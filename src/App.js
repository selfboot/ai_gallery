import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Link, Routes, useLocation } from 'react-router-dom';
import projects from './config/projects';
import GomokuGame from './games/gomoku';
import TetrisGame from './games/tetris';
import BFSPathFind from './algorithms/bfs_path';
import HeapVisualization from './algorithms/heap';

const ProjectCard = ({ title, description, image, link }) => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    <div className="aspect-w-16 aspect-h-9 relative">
      <img 
        src={image} 
        alt={title} 
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      <Link to={link} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
        玩一玩
      </Link>
    </div>
  </div>
);

const ProjectGrid = ({ category }) => {
  const projectList = projects[category] || [];
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-6">
      {projectList.map(project => (
        <ProjectCard key={project.id} {...project} />
      ))}
    </div>
  );
};

const CATEGORIES = [
  { id: 'games', name: '游戏' },
  { id: 'algorithms', name: '算法' },
  { id: 'others', name: '其他' }
];

const App = () => {
  return (
    <Router>
      <AppComponent />
    </Router>
  );
};

const AppComponent = () => {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].id);
  const location = useLocation();

  useEffect(() => {
    // 解析当前路径，并设置选中状态
    const pathParts = location.pathname.split('/'); // e.g., ['', 'algorithms', 'bfs_path']
    const currentCategory = pathParts[1]; // 'algorithms' 是分类 ID

    // 确保当前路径中的分类是有效的，否则默认选中第一个
    if (CATEGORIES.some(category => category.id === currentCategory)) {
      setSelectedCategory(currentCategory);
    } else {
      setSelectedCategory(CATEGORIES[0].id);
    }
  }, [location.pathname]);

  useEffect(() => {
    // Listening for changes in the query string.
    const query = new URLSearchParams(location.search);
    const category = query.get('category');
    if (category) {
      setSelectedCategory(category);
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-100">
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        <ul className="flex space-x-2 sm:space-x-4">
          {CATEGORIES.map(category => (
            <li key={category.id}>
              <Link to={`/?category=${category.id}`}
                    className={`px-2 sm:px-4 py-1 sm:py-2 rounded ${
                      selectedCategory === category.id
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
        <a href="https://github.com/selfboot/ai_gallery" target="_blank" rel="noopener noreferrer"
        className="flex items-center text-gray-600 hover:text-gray-800">
        <i className="fab fa-github fa-lg"></i>
        <span className="ml-2">Star</span>
        </a>
      </div>
    </nav>

      <main className="container mx-auto mt-6">
        <Routes>
          <Route path="/" element={
            <>
              <h2 className="text-2xl font-bold mb-4 px-6">{CATEGORIES.find(cat => cat.id === selectedCategory).name}</h2>
              <ProjectGrid category={selectedCategory} />
            </>
          } />
          <Route path="/games/gomoku" element={<GomokuGame />} />
          <Route path="/games/tetris" element={<TetrisGame />} />

          <Route path="/algorithms/bfs_path" element={<BFSPathFind />} />
          <Route path="/algorithms/heap" element={<HeapVisualization />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;

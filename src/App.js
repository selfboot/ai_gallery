import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';
import projects from './config/projects';
import GomokuGame from './games/gomoku';
import TetrisGame from './games/tetris';

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
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].id);

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-md">
          <div className="container mx-auto px-6 py-3">
            <ul className="flex space-x-4">
              {CATEGORIES.map(category => (
                <li key={category.id}>
                  <button
                    className={`px-4 py-2 rounded ${
                      selectedCategory === category.id
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name}
                  </button>
                </li>
              ))}
            </ul>
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
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;

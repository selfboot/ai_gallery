import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';
import { BrowserRouter as Router, Route, Link, Routes, useLocation } from 'react-router-dom';
import projects from './config/projects';
import GomokuGame from './games/gomoku';
import TetrisGame from './games/tetris';
import BFSPathFind from './algorithms/bfs_path';
import HeapVisualization from './algorithms/heap';
import AStarPathFind from './algorithms/a_start_path';
import ChinessChess from './games/chess';
import LanguageSwitcher from './language_switcher';
import Header from './header.js';
import GraphCreator from './algorithms/dijkstra';
import BarChartRace from './others/bar_chart_race';

const ProjectCard = ({ title, description, image, link }) => {
  const { t } = useTranslation(); // 获取翻译函数

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="aspect-w-16 aspect-h-9 relative">
        <img
          src={image}
          alt={t(title)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">{t(title)}</h3>
        <p className="text-gray-600 mb-4">{t(description)}</p>
        <Link to={link} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
          {t('try')}
        </Link>
      </div>
    </div>
  )
};

const ProjectGrid = ({ category }) => {
  const projectList = projects[category] || [];
  // console.log(projectList);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-6">
      {projectList.map(project => (
        <ProjectCard key={project.id} {...project} />
      ))}
    </div>
  );
};

const CATEGORIES = ['games', 'algorithms', 'others'];

const App = () => {
  return (
    <Router>
      <AppComponent />
    </Router>
  );
};

const AppComponent = () => {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [showHeader, setShowHeader] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  const trackPageView = (url) => {
    if (window.gtag) {
      window.gtag('config', 'G-Y4WD2DT404', {
        page_path: url,
      });
    }
  }

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const categoryFromQuery = query.get('category');
    const pathParts = location.pathname.split('/');
    const categoryFromPath = pathParts[1];

    const finalCategory = CATEGORIES.some(category => category === categoryFromQuery)
      ? categoryFromQuery
      : (CATEGORIES.some(category => category === categoryFromPath) ? categoryFromPath : CATEGORIES[0]);

    setSelectedCategory(finalCategory);
    setShowHeader(CATEGORIES.some(category => category === categoryFromPath))

    trackPageView(location.pathname);
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
          <ul className="flex space-x-2 sm:space-x-4">
            {CATEGORIES.map(category => (
              <li key={t(category)}>
                <Link to={`/?category=${category}`}
                  className={`px-2 sm:px-4 py-1 sm:py-2 rounded ${selectedCategory === category
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {t(category)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center space-x-4">
            <a href="https://github.com/selfboot/ai_gallery" target="_blank" rel="noopener noreferrer"
              className="flex items-center text-gray-600 hover:text-gray-800">
              <i className="fab fa-github fa-lg"></i>
              <span className="ml-2">Star</span>
            </a>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      <main className="container mx-auto mt-6">
        {showHeader && <Header />}
        <Routes>
          <Route path="/" element={
            <>
              <h2 className="text-xl font-bold mb-4 px-6">{t(CATEGORIES.find(cat => cat === selectedCategory))}</h2>
              <ProjectGrid category={selectedCategory} />
            </>
          } />
          {/* games */}
          <Route path="/games/gomoku" element={<GomokuGame />} />
          <Route path="/games/tetris" element={<TetrisGame />} />
          <Route path="/games/chess" element={<ChinessChess />} />

          {/* algorithms */}
          <Route path="/algorithms/bfs_path" element={<BFSPathFind />} />
          <Route path="/algorithms/heap" element={<HeapVisualization />} />
          <Route path="/algorithms/astar" element={<AStarPathFind />} />
          <Route path="/algorithms/dijkstra" element={<GraphCreator />} />

          {/* others */}
          <Route path="/others/bar_chart_race" element={<BarChartRace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;

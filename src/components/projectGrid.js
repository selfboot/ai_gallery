import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'gatsby';
import Projects from '../config/projects.js';

const ProjectCard = ({ title, description, image, link }) => {
  const { t } = useTranslation();
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
  );
};

const ProjectGrid = ({ category }) => {
  const projectList = Projects[category] || [];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-6">
      {projectList.map(project => (
        <ProjectCard key={project.id} {...project} />
      ))}
    </div>
  );
};

export default ProjectGrid;
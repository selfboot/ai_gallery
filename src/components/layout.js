import React, { useEffect } from 'react';
import { useTranslation } from "react-i18next";
import "../i18n.js";
import { Link } from "gatsby";
import i18n from 'i18next';
import LanguageSwitcher from "./language_switcher.js";
import { useLocation } from "@reach/router";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

const CATEGORIES = ["games", "algorithms", "others"];

const Layout = ({ children }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const currentCategory = location.pathname.split("/")[1];

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = i18n.language;
    }
  }, [i18n.language]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="container mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <ul className="flex flex-wrap justify-center sm:justify-start space-x-2 sm:space-x-4 mb-2 sm:mb-0">
              {CATEGORIES.map((category) => (
                <li key={t(category)}>
                  <Link
                    to={`/${category}/`}
                    className={`px-2 sm:px-4 py-1 sm:py-2 rounded ${
                      currentCategory === category ? "bg-blue-700 text-white" : "text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {t(category)}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/selfboot/ai_gallery"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-gray-600 hover:text-gray-800"
              >
                <FontAwesomeIcon icon={faGithub} size="lg" />
                <span className="ml-2">Star</span>
              </a>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-grow container mx-auto mt-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;

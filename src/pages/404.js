// src/pages/404.js
import React from "react";
import { Link } from "gatsby";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome, faUser } from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";

import { useTranslation } from "react-i18next";
const NotFoundPage = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-900">
      <div className="text-center">
        <p className="text-6xl font-bold">404</p>
        <div className="flex justify-center space-x-4 mt-6">
          <Link to="/" title={t("home")}>
            <FontAwesomeIcon icon={faHome} size="2x" className="text-gray-500 hover:text-gray-700" />
          </Link>
          <a href="https://github.com/selfboot/ai_gallery" title="GitHub">
            <FontAwesomeIcon icon={faGithub} size="2x" className="text-gray-500 hover:text-gray-800" />
          </a>
          <a href="https://selfboot.cn/links" title={t("profile")}>
            <FontAwesomeIcon icon={faUser} size="2x" className="text-gray-500 hover:text-gray-800" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCode } from "@fortawesome/free-solid-svg-icons";
import { useLocation } from "@reach/router";
import { useTranslation } from "react-i18next";
import { navigate } from "gatsby";

const PageHeader = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const getTitle = () => {

    const path = location.pathname.split("/")[2];
    if (path) return t(path + "_title");
    return t("home");
  };

  const handleBack = () => {
    const url = new URL(window.location);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    pathSegments.pop(); // 移除最后一部分
    const parentPath = `/${pathSegments.join("/")}`;
    navigate(parentPath ? parentPath : "/", { replace: true });
  };

  const getCodeLink = () => {
    const url = new URL(window.location);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const filePath = pathSegments.join("/");
    const baseUrl = "https://github.com/selfboot/ai_gallery/tree/main/src/pages";
    return `${baseUrl}/${filePath}.js`;
  };

  const codeLink = getCodeLink();
  return (
    <div className="flex items-center p-4">
      <h1 className="text-xl"> {getTitle()} </h1>
      <a href={codeLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 cursor-pointer flex items-center ml-4">
        <FontAwesomeIcon icon={faCode} className="mr-2" />
      </a>
      <span onClick={handleBack} className="text-blue-500 hover:text-blue-700 cursor-pointer flex items-center ml-4">
        <FontAwesomeIcon icon={faArrowLeft} />
      </span>
    </div>
  );
};

export default PageHeader;

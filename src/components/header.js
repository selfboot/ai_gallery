import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { useLocation } from "@reach/router";
import { useTranslation } from "react-i18next";
import { navigate } from "gatsby";

const PageHeader = () => {
  const location = useLocation();

  const getTitle = () => {
    const { t } = useTranslation();
    const path = location.pathname.split("/")[2];
    if (path) return t(path + "_title");
    return t("home");
  };

  const handleBack = () => {
    const url = new URL(window.location);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    pathSegments.pop(); // 移除最后一部分
    const parentPath = `/${pathSegments.join('/')}`;
    navigate(parentPath ? parentPath : "/", { replace: true });
  };

  return (
    <div className="flex items-center p-4">
      <h1 className="text-xl"> {getTitle()} </h1>
      <span onClick={handleBack} className="text-blue-500 hover:text-blue-700 cursor-pointer flex items-center ml-4">
        <FontAwesomeIcon icon={faArrowLeft} />
      </span>
    </div>
  );
};

export default PageHeader;

// components/PageHeader.js

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCode } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { getDictionary } from "@/app/dictionaries";
import ShareButtons from "./ShareButtons";

async function PageHeader({ lang, pathname }) {
  const dict = await getDictionary(lang);

  const getTitle = () => {
    const pathSegments = pathname.split("/").filter(Boolean);
    const currentPage = pathSegments[pathSegments.length - 1];
    return dict[`${currentPage}_title`] || currentPage;
  };

  const getCodeLink = () => {
    const pathSegments = pathname.split("/").filter(Boolean);
    const languages = ['zh', 'en'];
    const filePathSegments = pathSegments.filter(segment => !languages.includes(segment));
    const filePath = filePathSegments.join("/");
    const baseUrl = "https://github.com/selfboot/ai_gallery/tree/main/src/app/%5Blang%5D";
    return `${baseUrl}/${filePath}/content.js`;
  };

  const getBackLink = () => {
    const pathSegments = pathname.split("/").filter(Boolean);
    pathSegments.pop();
    return `/${pathSegments.join("/")}` || "/";
  };

  const title = getTitle();
  const codeLink = getCodeLink();
  const backLink = getBackLink();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex items-center gap-4">
          {codeLink && (
            <Link
              href={codeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 cursor-pointer flex items-center"
            >
              <FontAwesomeIcon icon={faCode} className="mr-2" />
            </Link>
          )}
          <Link
            href={backLink}
            className="text-blue-500 hover:text-blue-700 cursor-pointer flex items-center"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </Link>
        </div>
      </div>
      <ShareButtons />
    </div>
  );
}

export default PageHeader;

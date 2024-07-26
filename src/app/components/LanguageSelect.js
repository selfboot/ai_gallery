"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { setCookie } from "cookies-next";

export default function ClientLanguageSelect({ currentLang, languageOptions }) {
  const pathname = usePathname();

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    const currentPathSegments = pathname.split("/").filter(Boolean);

    // Replace the language segment (first segment) with the new language
    currentPathSegments[0] = newLang;

    // Construct the new path
    const newPath = `/${currentPathSegments.join("/")}`;

    setCookie("NEXT_LOCALE", newLang, { maxAge: 365 * 24 * 60 * 60 }); // 1 year expiry
    // Navigate to the new path
    window.location.href = newPath;
  };

  return (
    <select
      aria-label="Select language"
      value={currentLang}
      onChange={handleLanguageChange}
      className="bg-white text-right text-gray-900 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
    >
      {Object.entries(languageOptions).map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  );
}

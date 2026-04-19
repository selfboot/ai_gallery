import React from "react";
import Link from "next/link";
import ClientLanguageSelect from "./LanguageSelect";

const languageOptions = {
  en: "🇺🇸 English",
  zh: "🇨🇳 简体中文",
};

export default function LanguageSwitcher({ currentLang, currentPath }) {
  const alternateLanguages = Object.keys(languageOptions).filter(
    (lang) => lang !== currentLang
  );

  return (
    <div>
      <ClientLanguageSelect
        currentLang={currentLang}
        currentPath={currentPath}
        languageOptions={languageOptions}
      />
      {alternateLanguages.map((lang) => (
        <Link
          key={lang}
          href={currentPath.replace(`/${currentLang}`, `/${lang}`)}
          prefetch={false}
          rel="alternate"
          hrefLang={lang}
          className="hidden"
        >
          {languageOptions[lang]}
        </Link>
      ))}
    </div>
  );
}

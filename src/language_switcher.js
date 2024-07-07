import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language);

  useEffect(() => {
    const detectedLng = i18n.language;
    const supportedLng = ['zh', 'en']; // 实际支持的语言列表
    if (detectedLng.includes('-')) {
      const baseLng = detectedLng.split('-')[0];
      if (supportedLng.includes(baseLng)) {
        i18n.changeLanguage(baseLng);
      }
    }

    setLanguage(i18n.language);
  }, [i18n.language]);

  const handleLanguageChange = (event) => {
    const selectedLang = event.target.value;
    i18n.changeLanguage(selectedLang);
  };

  const languageOptions = {
    en: "🇺🇸 English",
    zh: "🇨🇳 简体中文"
  };

  return (
    <div>
      <select
        value={language}
        onChange={handleLanguageChange}
        className="bg-white text-right text-gray-900 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
      >
        {Object.entries(languageOptions).map(([code, name]) => (
          <option key={code} value={code}>{name}</option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSwitcher;

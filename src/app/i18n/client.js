"use client";

import { createContext, useContext, useState } from "react";

const I18nContext = createContext();

export function I18nProvider({ children, initialDictionary }) {
  const [dictionary, setDictionary] = useState(initialDictionary);

  const t = (key, params = {}) => {
    let translation = dictionary[key] || key;
    Object.keys(params).forEach((param) => {
      const regex = new RegExp(`{{${param}}}`, "g");
      translation = translation.replace(regex, params[param]);
    });
    return translation;
  };

  return (
    <I18nContext.Provider value={{ dictionary, setDictionary, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

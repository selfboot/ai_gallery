import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@/app/i18n/client';
import enTranslations from '@/app/dictionaries/en.json';
const AllTheProviders = ({ children }) => {
  return (
    <I18nProvider initialDictionary={enTranslations}>
      {children}
    </I18nProvider>
  );
};

const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// 重新导出所有内容
export * from '@testing-library/react';

// 覆盖 render 方法
export { customRender as render };

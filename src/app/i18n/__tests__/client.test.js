import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { I18nProvider, useI18n } from "../client";

function TranslationProbe() {
  const { t } = useI18n();

  return <div data-testid="translation-probe">{t("kmp_controls_hint_idle")}</div>;
}

describe("I18nProvider", () => {
  test("updates translations when the initial dictionary prop changes", () => {
    const { rerender } = render(
      <I18nProvider initialDictionary={{}}>
        <TranslationProbe />
      </I18nProvider>,
    );

    expect(screen.getByTestId("translation-probe")).toHaveTextContent("kmp_controls_hint_idle");

    rerender(
      <I18nProvider
        initialDictionary={{
          "kmp_controls_hint_idle": "Click a generate button to prepare steps.",
        }}
      >
        <TranslationProbe />
      </I18nProvider>,
    );

    expect(screen.getByTestId("translation-probe")).toHaveTextContent(
      "Click a generate button to prepare steps.",
    );
  });
});

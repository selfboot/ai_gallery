import React from "react";
import ProjectGrid from "../../components/projectGrid";
import Layout from "../../components/layout";
import { useTranslation } from "react-i18next";
import SEO from "../../components/seo";

const Games = () => {
  const { t } = useTranslation();

  return (
    <Layout>
      <h2 className="text-xl font-bold mb-4 px-6">{t("games")}</h2>
      <ProjectGrid category={"games"} />
    </Layout>
  );
};

export default Games;

export const Head = () => (
  <SEO
    title="Free online Games"
    description="Experience the classic game online. Challenge your reflexes and strategic thinking. No download required. And every game has source code available. You can play and learn how to build it."
    keywords="Free online games, source code game, react games, gpt4 games"
    canonicalUrl="https://gallery.selfboot.cn/games/"
  />
);
import React from "react";
import ProjectGrid from "../../components/projectGrid";
import Layout from "../../components/layout";
import { useTranslation } from "react-i18next";

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

import React from "react";
import ProjectGrid from "../../components/projectGrid";
import Layout from "../../components/layout";
import { useTranslation } from "react-i18next";
import SEO from "../../components/seo";

const Algorithms = () => {
  const { t } = useTranslation();

  return (
    <Layout>
      <SEO
        title="Algorithm Visualization"
        description="Learn and understand the many classic algorithms through interactive visualization. Explore how it works and enhance your algorithm knowledge. All the source codes is available and clear."
        keywords="algorithm, algorithm visualization, algorithm education"
        canonicalUrl="https://gallery.selfboot.cn/algorithms/"
      />
      <h2 className="text-xl font-bold mb-4 px-6">{t("algorithms")}</h2>
      <ProjectGrid category={"algorithms"} />
    </Layout>
  );
};

export default Algorithms;

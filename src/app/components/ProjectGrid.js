import React from "react";
import Link from "next/link";
import ResponsiveWebPImage from "@/app/components/ResponseImage";
import Projects from "@/app/config/project";
import { getDictionary } from "@/app/dictionaries";
import { SideAdComponent } from "@/app/components/AdComponent";

const ProjectCard = async ({ title, description, image, link, lang }) => {
  const dict = await getDictionary(lang);
  const isGif = image.toLowerCase().endsWith(".gif");
  const localizedLink = `/${lang}${link}`;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <ResponsiveWebPImage src={image} alt={dict[title] || title} isGif={isGif} />
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">{dict[title] || title}</h3>
        <p className="text-gray-600 mb-4">{dict[description] || description}</p>
        <Link href={localizedLink} className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 transition">
          {dict.try || "Try"}
        </Link>
      </div>
    </div>
  );
};

const ProjectGrid = async ({ category, lang }) => {
  const projectList = Projects[category] || [];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {projectList.map((project, index) => {
        if (index === 2) {
          return (
            <React.Fragment key={`ad-${index}`}>
              <ProjectCard {...project} lang={lang} />
              <div className="w-full bg-gray-100 min-h-[250px]">
                <SideAdComponent format="rectangle" />
              </div>
            </React.Fragment>
          );
        }
        return <ProjectCard key={project.id} {...project} lang={lang} />;
      })}
    </div>
  );
};

export default ProjectGrid;

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import ClientActiveLink from "@/app/components/ActiveLink";
import { getDictionary } from "@/app/dictionaries";
import MiniProgramCTA from "@/app/components/MiniProgramCTA";

export default async function Navigation({ categories, lang, pathname }) {
  const dict = await getDictionary(lang);

  return (
    <>
      <ul className="flex flex-wrap justify-center sm:justify-start space-x-2 sm:space-x-4 mb-2 sm:mb-0 -ml-2 sm:-ml-4">
        {categories.map((category) => (
          <li key={category}>
            <ClientActiveLink
              href={`/${lang}/${category}`}
              activeClassName="px-2 sm:px-4 py-1 sm:py-2 rounded bg-blue-700 text-white"
              inactiveClassName="px-2 sm:px-4 py-1 sm:py-2 rounded text-gray-600 hover:bg-gray-200"
              category={category}
            >
              <span>{dict[category]}</span>
            </ClientActiveLink>
          </li>
        ))}
      </ul>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
        <MiniProgramCTA
          className="w-full sm:w-auto"
          buttonLabel={dict.mini_program_cta_label}
          buttonMobileLabel={dict.mini_program_cta_mobile_label}
          modalTitle={dict.mini_program_modal_title}
          modalDescription={dict.mini_program_modal_description}
          closeLabel={dict.mini_program_modal_close}
          imageAlt={dict.mini_program_modal_title}
          imageSrc="https://slefboot-1251736664.cos.ap-beijing.myqcloud.com/puzzles/puzzles_game_mini_cover_square_small.jpg"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <a
            href="https://github.com/selfboot/ai_gallery"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded-full border border-gray-200 px-4 py-2 text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
          >
            <FontAwesomeIcon icon={faGithub} size="lg" />
            <span className="ml-2">Star</span>
          </a>
          <LanguageSwitcher currentLang={lang} currentPath={pathname} />
        </div>
      </div>
    </>
  );
}

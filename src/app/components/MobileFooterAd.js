"use client";

import { usePathname } from "next/navigation";
import MobileAdComponent from "@/app/_ads/MobileAdComponent";

export default function MobileFooterAd() {
  const pathname = usePathname();
  const [, section, ...rest] = pathname.split("/").filter(Boolean);

  // Tool pages place ads after the tool; game and algorithm directories use card ads.
  if (section === "tools" || (rest.length === 0 && ["games", "algorithms"].includes(section))) return null;

  return (
    <div className="container mx-auto mt-8 px-2 pb-6 empty:hidden sm:px-4 md:hidden">
      <MobileAdComponent className="mx-auto max-w-xl rounded border border-gray-200" />
    </div>
  );
}

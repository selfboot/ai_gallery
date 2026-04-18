"use client";

import dynamic from "next/dynamic";

const PdfOrganizeContent = dynamic(() => import("./content"), { ssr: false });

export default function ClientContent(props) {
  return <PdfOrganizeContent {...props} />;
}

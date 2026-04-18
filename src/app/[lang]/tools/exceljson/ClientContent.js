"use client";

import dynamic from "next/dynamic";

const ExcelJsonContent = dynamic(() => import("./content"), { ssr: false });

export default function ClientContent(props) {
  return <ExcelJsonContent {...props} />;
}

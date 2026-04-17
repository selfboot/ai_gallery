"use client";

import dynamic from "next/dynamic";

const ExcelSplitMergeContent = dynamic(() => import("./content"), { ssr: false });

export default function ClientContent(props) {
  return <ExcelSplitMergeContent {...props} />;
}

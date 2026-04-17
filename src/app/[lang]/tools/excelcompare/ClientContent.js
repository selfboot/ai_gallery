"use client";

import dynamic from "next/dynamic";

const ExcelCompareContent = dynamic(() => import("./content"), { ssr: false });

export default function ClientContent(props) {
  return <ExcelCompareContent {...props} />;
}

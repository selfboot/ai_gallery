"use client";

import dynamic from "next/dynamic";
import ToolContentLoading from "@/app/components/ToolContentLoading";

const WordFormatContent = dynamic(() => import("./content"), {
  ssr: false,
  loading: () => <ToolContentLoading />,
});

export default function ClientContent(props) {
  return <WordFormatContent {...props} />;
}

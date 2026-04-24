"use client";

import dynamic from "next/dynamic";
import ToolContentLoading from "@/app/components/ToolContentLoading";

const ImageMetadataContent = dynamic(() => import("./content"), {
  ssr: false,
  loading: () => <ToolContentLoading />,
});

export default function ClientContent() {
  return <ImageMetadataContent />;
}

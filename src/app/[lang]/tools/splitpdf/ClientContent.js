"use client";
import dynamic from "next/dynamic";
const PdfSplitContent = dynamic(() => import("./content"), { ssr: false });
export default function ClientContent(props) {
  return <PdfSplitContent {...props} />;
}

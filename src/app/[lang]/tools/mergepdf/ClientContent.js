"use client";
import dynamic from "next/dynamic";
const PdfMergerContent = dynamic(() => import("./content"), { ssr: false });
export default function ClientContent(props) {
  return <PdfMergerContent {...props} />;
}

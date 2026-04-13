"use client";
import dynamic from "next/dynamic";
const WordMergerContent = dynamic(() => import("./content"), { ssr: false });
export default function ClientContent(props) {
  return <WordMergerContent {...props} />;
}

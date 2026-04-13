"use client";
import dynamic from "next/dynamic";
const WordSplitContent = dynamic(() => import("./content"), { ssr: false });
export default function ClientContent(props) {
  return <WordSplitContent {...props} />;
}

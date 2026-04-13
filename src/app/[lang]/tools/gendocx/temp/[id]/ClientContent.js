"use client";
import dynamic from "next/dynamic";
const TemplateDocx = dynamic(() => import("./content"), { ssr: false });
export default function ClientContent(props) {
  return <TemplateDocx {...props} />;
}

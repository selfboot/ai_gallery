"use client";
import dynamic from "next/dynamic";
const GenAwards = dynamic(() => import("./content"), { ssr: false });
export default function ClientContent(props) {
  return <GenAwards {...props} />;
}

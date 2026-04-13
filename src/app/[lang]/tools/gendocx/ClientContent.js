"use client";
import dynamic from "next/dynamic";
const GenDocx = dynamic(() => import("./content"), { ssr: false });
export default function ClientContent(props) {
  return <GenDocx {...props} />;
}

"use client";
import dynamic from "next/dynamic";
const DynamicChart = dynamic(() => import("./content"), { ssr: false });
export default function ClientContent(props) {
  return <DynamicChart {...props} />;
}

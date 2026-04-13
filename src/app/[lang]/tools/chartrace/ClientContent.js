"use client";
import dynamic from "next/dynamic";
const ChartRace = dynamic(() => import("./content"), { ssr: false });
export default function ClientContent(props) {
  return <ChartRace {...props} />;
}

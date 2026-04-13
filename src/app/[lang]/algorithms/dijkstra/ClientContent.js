"use client";
import dynamic from "next/dynamic";
const DijkstraVisualization = dynamic(() => import("./content"), { ssr: false });
export default function ClientContent(props) {
  return <DijkstraVisualization {...props} />;
}

"use client";
import dynamic from "next/dynamic";
const DijkstraVisualization = dynamic(() => import("./content"), {
  ssr: false,
  loading: () => <div className="w-full min-h-[680px]" />,
});
export default function ClientContent(props) {
  return <DijkstraVisualization {...props} />;
}

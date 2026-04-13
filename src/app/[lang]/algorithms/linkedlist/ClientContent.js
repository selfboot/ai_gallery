"use client";
import dynamic from "next/dynamic";
const LinkedListVisualization = dynamic(() => import("./content"), { ssr: false });
export default function ClientContent(props) {
  return <LinkedListVisualization {...props} />;
}

"use client";
import dynamic from "next/dynamic";
const TokenBucketVisualization = dynamic(() => import("./content"), { ssr: false });
export default function ClientContent(props) {
  return <TokenBucketVisualization {...props} />;
}

"use client";
import dynamic from "next/dynamic";
const TokenBucketVisualization = dynamic(() => import("./content"), {
  ssr: false,
  loading: () => <div className="w-full min-h-[640px]" />,
});
export default function ClientContent(props) {
  return <TokenBucketVisualization {...props} />;
}

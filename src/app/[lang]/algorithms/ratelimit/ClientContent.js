"use client";
import dynamic from "next/dynamic";
const RateLimiter = dynamic(() => import("./content"), {
  ssr: false,
  loading: () => <div className="w-full min-h-[450px]" />,
});
export default function ClientContent(props) {
  return <RateLimiter {...props} />;
}

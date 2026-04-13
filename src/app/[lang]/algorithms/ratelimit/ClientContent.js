"use client";
import dynamic from "next/dynamic";
const RateLimiter = dynamic(() => import("./content"), { ssr: false });
export default function ClientContent(props) {
  return <RateLimiter {...props} />;
}

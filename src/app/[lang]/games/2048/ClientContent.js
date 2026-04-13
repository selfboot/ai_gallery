"use client";
import dynamic from "next/dynamic";
const Content = dynamic(() => import("./content"), { ssr: false });
export default function ClientContent(props) {
  return <Content {...props} />;
}

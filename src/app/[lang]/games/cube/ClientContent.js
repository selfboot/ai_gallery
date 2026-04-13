"use client";
import dynamic from "next/dynamic";
const CubeGame = dynamic(() => import("./content"), { ssr: false });
export default function ClientContent(props) {
  return <CubeGame {...props} />;
}

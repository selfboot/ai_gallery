"use client";
import dynamic from "next/dynamic";
const Content = dynamic(() => import("./content"), {
  ssr: false,
  loading: () => <div className="w-full min-h-[500px]" />,
});
export default function ClientContent(props) {
  return <Content {...props} />;
}

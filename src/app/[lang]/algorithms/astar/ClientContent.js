"use client";
import dynamic from "next/dynamic";
import InteractiveContentLoading from "@/app/components/InteractiveContentLoading";

const Content = dynamic(() => import("./content"), {
  ssr: false,
  loading: () => <InteractiveContentLoading title="Loading path finder..." />,
});
export default function ClientContent(props) {
  return <Content {...props} />;
}

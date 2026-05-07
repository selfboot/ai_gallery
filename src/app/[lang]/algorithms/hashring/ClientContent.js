"use client";
import dynamic from "next/dynamic";
import InteractiveContentLoading, { LOADING_VARIANTS } from "@/app/components/InteractiveContentLoading";

const Content = dynamic(() => import("./content"), {
  ssr: false,
  loading: () => <InteractiveContentLoading variant={LOADING_VARIANTS.ring} title="Loading hash ring..." />,
});
export default function ClientContent(props) {
  return <Content {...props} />;
}

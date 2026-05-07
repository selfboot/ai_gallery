"use client";
import dynamic from "next/dynamic";
import InteractiveContentLoading, { LOADING_VARIANTS } from "@/app/components/InteractiveContentLoading";

const CubeGame = dynamic(() => import("./content"), {
  ssr: false,
  loading: () => <InteractiveContentLoading variant={LOADING_VARIANTS.cube} title="Loading cube..." />,
});
export default function ClientContent(props) {
  return <CubeGame {...props} />;
}

"use client";
import dynamic from "next/dynamic";
import ToolContentLoading from "@/app/components/ToolContentLoading";
const DynamicChart = dynamic(() => import("./content"), { ssr: false, loading: () => <ToolContentLoading /> });
export default function ClientContent(props) {
  return <DynamicChart {...props} />;
}

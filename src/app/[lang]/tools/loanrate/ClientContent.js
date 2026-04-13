"use client";
import dynamic from "next/dynamic";
const LoanRateCalculator = dynamic(() => import("./content"), { ssr: false });
export default function ClientContent(props) {
  return <LoanRateCalculator {...props} />;
}

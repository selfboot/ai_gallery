import MobileAdComponent from "@/app/_ads/MobileAdComponent";

export default function MobileToolAd({ className = "" }) {
  return <MobileAdComponent className={`mx-auto max-w-xl rounded border border-gray-200 md:hidden ${className}`} />;
}

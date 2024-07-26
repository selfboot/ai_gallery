"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ClientActiveLink({
  children,
  href,
  activeClassName,
  inactiveClassName,
  category,
}) {
  const pathname = usePathname();
  const currentCategory = pathname.split("/")[2] || "";

  const isActive = currentCategory === category;
  const className = isActive ? activeClassName : inactiveClassName;

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function HideOnRoles({ children }: Props) {
  const pathname = usePathname();

  if (!pathname) return null;

  const HIDDEN_PREFIXES = [
    "/admin",
    "/repartidor",
    "/api/admin",
    "/api/repartidor",
  ];

  const shouldHide = HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (shouldHide) return null;

  return <>{children}</>;
}

"use client";

import { useAuth } from "@/contexts/auth-context";
import type { ReactNode } from "react";

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  const { isAdmin, loading } = useAuth();

  if (loading) return null;
  if (!isAdmin) return <>{fallback}</>;

  return <>{children}</>;
}

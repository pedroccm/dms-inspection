"use client";

import { createContext, useContext, type ReactNode } from "react";

interface ServerProfile {
  full_name: string;
  role: string;
}

const ServerProfileContext = createContext<ServerProfile | null>(null);

export function ServerProfileProvider({
  profile,
  children,
}: {
  profile: ServerProfile | null;
  children: ReactNode;
}) {
  return (
    <ServerProfileContext.Provider value={profile}>
      {children}
    </ServerProfileContext.Provider>
  );
}

export function useServerProfile() {
  return useContext(ServerProfileContext);
}

export function useIsAdmin() {
  const profile = useContext(ServerProfileContext);
  return profile?.role === "admin";
}

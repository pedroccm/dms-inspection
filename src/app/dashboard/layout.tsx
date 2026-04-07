import { getProfile } from "@/lib/auth";
import DashboardShell from "./dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  const initialProfile = profile
    ? { full_name: profile.full_name, role: profile.role }
    : null;

  return (
    <DashboardShell initialProfile={initialProfile}>
      {children}
    </DashboardShell>
  );
}

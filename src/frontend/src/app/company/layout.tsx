import { OperationalShell } from "@/components/ui/OperationalShell/OperationalShell";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <OperationalShell role="company">{children}</OperationalShell>;
}

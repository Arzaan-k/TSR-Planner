import { Header } from "./header";
import { BottomNavigation } from "./bottom-navigation";
import { useAuth } from "@/hooks/use-auth";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, role } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background" data-testid="app-shell">
      <Header />
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
      <BottomNavigation userRole={role} />
    </div>
  );
}

import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Dashboard() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to tasks by default
    if (location === "/") {
      setLocation("/tasks");
    }
  }, [location, setLocation]);

  return (
    <AuthGuard>
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Redirecting to tasks...</p>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { TeamProvider } from "@/hooks/use-team";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Tasks from "@/pages/tasks";
import Notes from "@/pages/notes";
import Teams from "@/pages/teams";
import Users from "@/pages/users";
import Profile from "@/pages/profile";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/notes" component={Notes} />
      <Route path="/teams" component={Teams} />
      <Route path="/users" component={Users} />
      <Route path="/profile" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <TeamProvider>
            <Router />
            <Toaster />
          </TeamProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

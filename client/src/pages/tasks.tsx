import { useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { DateCard } from "@/components/teams/date-card";
import { TaskCard } from "@/components/tasks/task-card";
import { AddTaskModal } from "@/components/tasks/add-task-modal";
import { FAB } from "@/components/ui/fab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useTeam } from "@/hooks/use-team";
import { useSearch } from "@/hooks/use-search";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function Tasks() {
  const { user, role } = useAuth();
  const { selectedTeam, teams } = useTeam();
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const { searchQuery, setSearchQuery, debouncedQuery } = useSearch();
  const [, setLocation] = useLocation();

  const canCreateTasks = role === "Admin" || role === "Superadmin" || role === "Coordinator";

  // Get team member info for the current user
  const { data: userTeamMember } = useQuery({
    queryKey: ["/api/teams", selectedTeam, "member", user?.id],
    queryFn: async () => {
      if (!selectedTeam || !user?.id) return null;
      const response = await fetch("/api/teams", { credentials: "include" });
      if (response.ok) {
        const teams = await response.json();
        const team = teams.find((t: any) => t.id === selectedTeam);
        return team?.members?.find((m: any) => m.userId === user.id) || null;
      }
      return null;
    },
    enabled: !!selectedTeam && !!user?.id,
  });

  // Fetch tasks based on role and team
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ["/api/tasks", selectedTeam?.id, userTeamMember?.id, role],
    queryFn: async () => {
      if (!selectedTeam) return [];
      
      let url = "/api/tasks";
      const params = new URLSearchParams();
      
      if (role === "Member") {
        // Members only see tasks assigned to them
        if (!userTeamMember?.id) return [];
        params.append("memberId", userTeamMember.id);
      } else {
        // Admins, Superadmins, and Coordinators see all team tasks
        params.append("teamId", selectedTeam.id);
      }
      
      const response = await fetch(`${url}?${params}`, { credentials: "include" });
      if (response.ok) {
        const allTasks = await response.json();
        // Filter to show active tasks (Open, In-Progress, Blocked, Done)
        // Done tasks are considered completed but still visible
        return allTasks.filter((task: any) => 
          ["Open", "In-Progress", "Blocked", "Done"].includes(task.status)
        );
      }
      throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
    },
    enabled: !!selectedTeam && (role !== "Member" || !!userTeamMember),
  });

  // Search tasks
  const { data: searchResults = [] } = useQuery({
    queryKey: ["/api/tasks/search", debouncedQuery, selectedTeam?.id],
    queryFn: async () => {
      if (!debouncedQuery || !selectedTeam) return [];
      
      const params = new URLSearchParams();
      params.append("q", debouncedQuery);
      params.append("teamId", selectedTeam.id);
      
      const response = await fetch(`/api/tasks/search?${params}`, { credentials: "include" });
      if (response.ok) {
        const allTasks = await response.json();
        // Filter to show active tasks (Open, In-Progress, Blocked, Done)
        // Done tasks are considered completed but still visible
        return allTasks.filter((task: any) => 
          ["Open", "In-Progress", "Blocked", "Done"].includes(task.status)
        );
      }
      return [];
    },
    enabled: !!debouncedQuery && !!selectedTeam,
  });

  const displayTasks = debouncedQuery ? searchResults : tasks;
  const canEditTasks = role === "Admin" || role === "Superadmin" || 
                      (role === "Coordinator" && !!selectedTeam);

  if (!selectedTeam) {
    return (
      <AuthGuard>
        <AppShell>
          <div className="flex items-center justify-center h-full p-4" data-testid="no-team-selected">
            <div className="text-center max-w-md">
              <h2 className="text-lg font-semibold text-foreground mb-2">
                {teams.length > 0 ? "Select a Team" : "No Teams Available"}
              </h2>
              <p className="text-muted-foreground mb-4">
                {teams.length > 0 
                  ? "Choose a team from the dropdown above to view and manage tasks."
                  : "You are not currently a member of any teams. Contact your administrator to be added to a team or create a new team if you have the necessary permissions."
                }
              </p>
              {teams.length === 0 && (
                <Button 
                  onClick={() => setLocation("/teams")}
                  variant="default"
                  className="mt-2"
                >
                  Manage Teams
                </Button>
              )}
            </div>
          </div>
        </AppShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="h-full flex flex-col" data-testid="tasks-page">
          <DateCard />
          
          {/* Search Bar */}
          <div className="p-4 bg-card border-b border-border">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                data-testid="search-tasks-input"
              />
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Tasks List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="tasks-list">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))
            ) : error ? (
              <div className="text-center py-8" data-testid="tasks-error">
                <h3 className="font-medium text-foreground mb-2">
                  Error Loading Tasks
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {error instanceof Error ? error.message : "Failed to load tasks"}
                </p>
                <Button onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
              </div>
            ) : displayTasks.length === 0 ? (
              <div className="text-center py-8" data-testid="no-tasks-message">
                <h3 className="font-medium text-foreground mb-2">
                  {debouncedQuery ? "No tasks found" : "No open tasks"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {debouncedQuery 
                    ? "Try adjusting your search query."
                    : "Create your first task to get started."
                  }
                </p>
              </div>
            ) : (
              displayTasks.map((task: any) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  canEdit={canEditTasks}
                />
              ))
            )}
          </div>

          {/* Add Task FAB */}
          {canCreateTasks && (
            <FAB onClick={() => setShowAddTaskModal(true)} data-testid="fab-add-task">
              <Plus className="w-6 h-6" />
            </FAB>
          )}

          <AddTaskModal
            open={showAddTaskModal}
            onClose={() => setShowAddTaskModal(false)}
          />
        </div>
      </AppShell>
    </AuthGuard>
  );
}

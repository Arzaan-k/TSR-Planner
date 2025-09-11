import { useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { TeamCard } from "@/components/teams/team-card";
import { AddTeamModal } from "@/components/teams/add-team-modal";
import { FAB } from "@/components/ui/fab";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useSearch } from "@/hooks/use-search";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Teams() {
  const { role } = useAuth();
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const { searchQuery, setSearchQuery, debouncedQuery } = useSearch();

  // Only admins can access this page
  if (role !== "Admin" && role !== "Superadmin") {
    return (
      <AuthGuard>
        <AppShell>
          <div className="flex items-center justify-center h-full p-4" data-testid="access-denied">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Access Denied
              </h2>
              <p className="text-muted-foreground">
                You don't have permission to access team management.
              </p>
            </div>
          </div>
        </AppShell>
      </AuthGuard>
    );
  }

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ["/api/teams"],
  });

  // Search teams
  const { data: searchResults = [] } = useQuery({
    queryKey: ["/api/teams/search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      
      const params = new URLSearchParams();
      params.append("q", debouncedQuery);
      
      const response = await fetch(`/api/teams/search?${params}`, { credentials: "include" });
      if (response.ok) {
        return response.json();
      }
      return [];
    },
    enabled: !!debouncedQuery,
  });

  const displayTeams = debouncedQuery ? searchResults : teams;

  return (
    <AuthGuard>
      <AppShell>
        <div className="h-full flex flex-col" data-testid="teams-page">
          <div className="p-4 bg-card border-b border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Teams</h2>
            
            {/* Search Bar */}
            <div className="relative">
              <Input
                type="text"
                placeholder="Search teams and members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                data-testid="search-teams-input"
              />
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Teams List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="teams-list">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))
            ) : displayTeams.length === 0 ? (
              <div className="text-center py-8" data-testid="no-teams-message">
                <h3 className="font-medium text-foreground mb-2">
                  {debouncedQuery ? "No teams found" : "No teams yet"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {debouncedQuery 
                    ? "Try adjusting your search query."
                    : "Create your first team to get started."
                  }
                </p>
              </div>
            ) : (
              displayTeams.map((team: any) => (
                <TeamCard key={team.id} team={team} />
              ))
            )}
          </div>

          {/* Add Team FAB */}
          <FAB onClick={() => setShowAddTeamModal(true)} data-testid="fab-add-team">
            <Plus className="w-6 h-6" />
          </FAB>

          <AddTeamModal
            open={showAddTeamModal}
            onClose={() => setShowAddTeamModal(false)}
          />
        </div>
      </AppShell>
    </AuthGuard>
  );
}

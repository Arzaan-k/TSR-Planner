import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { SnapshotCard } from "@/components/notes/snapshot-card";
import { Input } from "@/components/ui/input";
import { useTeam } from "@/hooks/use-team";
import { useSearch } from "@/hooks/use-search";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Notes() {
  const { selectedTeam } = useTeam();
  const { searchQuery, setSearchQuery, debouncedQuery } = useSearch();

  // Fetch minutes for the selected team
  const { data: minutes = [], isLoading } = useQuery({
    queryKey: ["/api/minutes", selectedTeam?.id],
    queryFn: async () => {
      if (!selectedTeam) return [];
      
      const response = await fetch(`/api/minutes?teamId=${selectedTeam.id}`, { 
        credentials: "include" 
      });
      if (response.ok) {
        return response.json();
      }
      return [];
    },
    enabled: !!selectedTeam,
  });

  // Filter minutes and snapshots by search query
  const filteredMinutes = minutes.filter((minute: any) => {
    if (!debouncedQuery) return true;
    
    const searchTerm = debouncedQuery.toLowerCase();
    
    // Search in date
    const dateMatch = minute.date.includes(searchTerm);
    
    // Search in venue
    const venueMatch = minute.venue?.toLowerCase().includes(searchTerm);
    
    // Search in snapshots
    const snapshotMatch = minute.snapshots?.some((snapshot: any) => {
      const task = snapshot.payload;
      const titleMatch = task.title?.toLowerCase().includes(searchTerm);
      const notesMatch = task.notes?.toLowerCase().includes(searchTerm);
      const changeTypeMatch = snapshot.changeType?.toLowerCase().includes(searchTerm);
      const memberMatch = task.responsibleMember?.user?.displayName?.toLowerCase().includes(searchTerm);
      
      return titleMatch || notesMatch || changeTypeMatch || memberMatch;
    });
    
    return dateMatch || venueMatch || snapshotMatch;
  });

  if (!selectedTeam) {
    return (
      <AuthGuard>
        <AppShell>
          <div className="flex items-center justify-center h-full p-4" data-testid="no-team-selected">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Select a Team
              </h2>
              <p className="text-muted-foreground">
                Choose a team from the dropdown above to view meeting notes.
              </p>
            </div>
          </div>
        </AppShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="h-full flex flex-col" data-testid="notes-page">
          {/* Search Bar */}
          <div className="p-4 bg-card border-b border-border">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search notes and snapshots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                data-testid="search-notes-input"
              />
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Minutes List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="minutes-list">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <div className="space-y-2 ml-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              ))
            ) : filteredMinutes.length === 0 ? (
              <div className="text-center py-8" data-testid="no-minutes-message">
                <h3 className="font-medium text-foreground mb-2">
                  {debouncedQuery ? "No notes found" : "No meeting notes yet"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {debouncedQuery 
                    ? "Try adjusting your search query."
                    : "Notes will appear here when tasks are created or updated."
                  }
                </p>
              </div>
            ) : (
              filteredMinutes.map((minute: any) => (
                <div key={minute.id} className="space-y-3" data-testid={`minute-${minute.id}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground" data-testid="minute-date">
                      {new Date(minute.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </h3>
                    <div className="text-sm text-muted-foreground" data-testid="minute-meta">
                      <span>{minute.venue || "No venue"}</span>
                      {Array.isArray(minute.attendance) && (
                        <>
                          {" • "}
                          <span>{minute.attendance.length} present</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Snapshot Cards */}
                  {minute.snapshots && minute.snapshots.length > 0 ? (
                    <div className="space-y-2 ml-4" data-testid="snapshots-list">
                      {minute.snapshots
                        .filter((snapshot: any) => {
                          if (!debouncedQuery) return true;
                          
                          const searchTerm = debouncedQuery.toLowerCase();
                          const task = snapshot.payload;
                          const titleMatch = task.title?.toLowerCase().includes(searchTerm);
                          const notesMatch = task.notes?.toLowerCase().includes(searchTerm);
                          const changeTypeMatch = snapshot.changeType?.toLowerCase().includes(searchTerm);
                          const memberMatch = task.responsibleMember?.user?.displayName?.toLowerCase().includes(searchTerm);
                          
                          return titleMatch || notesMatch || changeTypeMatch || memberMatch;
                        })
                        .map((snapshot: any) => (
                          <SnapshotCard key={snapshot.id} snapshot={snapshot} />
                        ))
                      }
                    </div>
                  ) : (
                    <div className="ml-4 p-3 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
                      No task changes recorded for this date
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

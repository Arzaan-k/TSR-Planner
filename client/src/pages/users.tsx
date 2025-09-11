import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { UserCard } from "@/components/users/user-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useSearch } from "@/hooks/use-search";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function Users() {
  const { role } = useAuth();
  const { searchQuery, setSearchQuery, debouncedQuery } = useSearch();
  const [sortBy, setSortBy] = useState("admin-desc");

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
                You don't have permission to access user management.
              </p>
            </div>
          </div>
        </AppShell>
      </AuthGuard>
    );
  }

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  // Search users
  const { data: searchResults = [] } = useQuery({
    queryKey: ["/api/users/search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      
      const params = new URLSearchParams();
      params.append("q", debouncedQuery);
      
      const response = await fetch(`/api/users/search?${params}`, { credentials: "include" });
      if (response.ok) {
        return response.json();
      }
      return [];
    },
    enabled: !!debouncedQuery,
  });

  // Sort users
  const sortUsers = (userList: any[]) => {
    return [...userList].sort((a, b) => {
      switch (sortBy) {
        case "admin-desc":
          if (a.role === b.role) return (a.displayName || a.email).localeCompare(b.displayName || b.email);
          const roleOrder = { "Superadmin": 4, "Admin": 3, "Coordinator": 2, "Member": 1 };
          return (roleOrder[b.role as keyof typeof roleOrder] || 0) - (roleOrder[a.role as keyof typeof roleOrder] || 0);
        case "name-asc":
          return (a.displayName || a.email).localeCompare(b.displayName || b.email);
        case "name-desc":
          return (b.displayName || b.email).localeCompare(a.displayName || a.email);
        case "email-asc":
          return a.email.localeCompare(b.email);
        default:
          return 0;
      }
    });
  };

  const displayUsers = sortUsers(debouncedQuery ? searchResults : users);

  return (
    <AuthGuard>
      <AppShell>
        <div className="h-full flex flex-col" data-testid="users-page">
          <div className="p-4 bg-card border-b border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Users</h2>
            
            {/* Search and Sort */}
            <div className="space-y-3">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  data-testid="search-users-input"
                />
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              </div>
              
              <div className="flex space-x-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48" data-testid="sort-users-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin-desc">Admin Status ↓</SelectItem>
                    <SelectItem value="name-asc">Name ↑</SelectItem>
                    <SelectItem value="name-desc">Name ↓</SelectItem>
                    <SelectItem value="email-asc">Email ↑</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="users-list">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))
            ) : displayUsers.length === 0 ? (
              <div className="text-center py-8" data-testid="no-users-message">
                <h3 className="font-medium text-foreground mb-2">
                  {debouncedQuery ? "No users found" : "No users yet"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {debouncedQuery 
                    ? "Try adjusting your search query."
                    : "Users will appear here when they sign in."
                  }
                </p>
              </div>
            ) : (
              displayUsers.map((user: any) => (
                <UserCard key={user.id} user={user} />
              ))
            )}
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}

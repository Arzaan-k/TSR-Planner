import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTeam } from "@/hooks/use-team";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { signOutUser } from "@/lib/auth";
import { useLocation } from "wouter";

export function Header() {
  const { user } = useAuth();
  const { selectedTeam, setSelectedTeam } = useTeam();
  const [, setLocation] = useLocation();

  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ["/api/teams"],
  });

  const handleSignOut = async () => {
    try {
      await signOutUser();
      window.location.reload();
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const handleProfileClick = () => {
    setLocation("/profile");
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-40" data-testid="app-header">
      <div className="flex items-center space-x-3">
        <h1 className="text-xl font-semibold text-foreground" data-testid="app-title">
          TSR Planner
        </h1>
      </div>
      
      <div className="flex-1 mx-4">
        <Select value={selectedTeam || ""} onValueChange={setSelectedTeam} data-testid="team-selector">
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Team" />
          </SelectTrigger>
          <SelectContent>
            {teams.map((team: any) => (
              <SelectItem key={team.id} value={team.id} data-testid={`team-option-${team.id}`}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild data-testid="user-menu-trigger">
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarImage src={user?.photoUrl || undefined} />
            <AvatarFallback className="text-sm font-medium">
              {getInitials(user?.displayName)}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleProfileClick} data-testid="menu-profile">
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut} data-testid="menu-signout">
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

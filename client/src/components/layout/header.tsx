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
import { signOutUser } from "@/lib/auth";
import { useLocation } from "wouter";

export function Header() {
  const { user } = useAuth();
  const { selectedTeam, setSelectedTeam, teams } = useTeam();
  const [, setLocation] = useLocation();

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
      
      <div className="flex-1 mx-4 min-w-0">
        <Select 
          value={selectedTeam?.id || ""} 
          onValueChange={(teamId) => {
            const team = teams.find(t => t.id === teamId);
            setSelectedTeam(team || null);
          }} 
          data-testid="team-selector"
        >
          <SelectTrigger className="w-full max-w-full overflow-hidden">
            <SelectValue placeholder="Select Team" className="truncate" />
          </SelectTrigger>
          <SelectContent>
            {teams.map((team) => (
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

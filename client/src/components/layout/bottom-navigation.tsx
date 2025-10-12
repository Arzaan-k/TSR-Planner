import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  ClipboardList, 
  FileText, 
  Users, 
  UserCog, 
  User 
} from "lucide-react";

interface BottomNavigationProps {
  userRole?: string;
}

export function BottomNavigation({ userRole }: BottomNavigationProps) {
  const [location, setLocation] = useLocation();

  const isAdmin = userRole === "Admin" || userRole === "Superadmin";

  const tabs = [
    { id: "tasks", label: "Tasks", icon: ClipboardList, path: "/tasks", alwaysShow: true },
    { id: "notes", label: "Notes", icon: FileText, path: "/notes", alwaysShow: true },
    { id: "teams", label: "Teams", icon: Users, path: "/teams", alwaysShow: false, adminOnly: true },
    { id: "users", label: "Users", icon: UserCog, path: "/users", alwaysShow: false, adminOnly: true },
    { id: "profile", label: "Profile", icon: User, path: "/profile", alwaysShow: true },
  ];

  const visibleTabs = tabs.filter(tab => 
    tab.alwaysShow || (tab.adminOnly && isAdmin)
  );

  return (
    <nav className="bg-card border-t border-border px-2 py-2 flex items-center justify-around sticky bottom-0 z-40 w-full max-w-full overflow-x-hidden" data-testid="bottom-navigation">
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = location === tab.path || (location === "/" && tab.path === "/tasks");
        
        return (
          <button
            key={tab.id}
            onClick={() => setLocation(tab.path)}
            className={cn(
              "flex flex-col items-center py-2 px-3 rounded-lg transition-colors",
              isActive 
                ? "text-primary border-t-2 border-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
            data-testid={`nav-${tab.id}`}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

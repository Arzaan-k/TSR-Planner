import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./use-auth";
import { apiRequest } from "@/lib/queryClient";

interface Team {
  id: string;
  name: string;
  defaultVenue?: string;
  members?: Array<{
    id: string;
    userId: string;
    isCoordinator: boolean;
    user: {
      id: string;
      email: string;
      displayName?: string;
      photoUrl?: string;
    };
  }>;
  coordinators?: Array<{
    id: string;
    userId: string;
    isCoordinator: boolean;
    user: {
      id: string;
      email: string;
      displayName?: string;
      photoUrl?: string;
    };
  }>;
}

interface TeamContextType {
  selectedTeam: Team | null;
  setSelectedTeam: (team: Team | null) => void;
  teams: Team[];
  loading: boolean;
  refreshTeams: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, role } = useAuth();

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("GET", "/api/teams");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch teams: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setTeams(data);
      
      // If no team is selected and we have teams, select the first one
      if (!selectedTeam && data.length > 0) {
        setSelectedTeam(data[0]);
      } else if (data.length === 0) {
        // Clear selected team if user has no teams
        setSelectedTeam(null);
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
      // Set teams to empty array and clear selected team on error
      setTeams([]);
      setSelectedTeam(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user]);

  const refreshTeams = async () => {
    await fetchTeams();
  };

  return (
    <TeamContext.Provider value={{
      selectedTeam,
      setSelectedTeam,
      teams,
      loading,
      refreshTeams
    }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
}
